import { prisma } from "../../shared/prisma/client.js";
import { errorNegocio } from "../../shared/errores/error-negocio.js";
import { esTutorVisible } from "../busqueda/busqueda.repository.js";
import { DIAS_POR_SEMANA, HORAS_PERMITIDAS, ZONA_HORARIA } from "./disponibilidad.constantes.js";
import {
  aplicarCambiosDeSemana,
  bloquesDeTutorEntre,
  bloquesLibresDeTutor,
} from "./disponibilidad.repository.js";
import {
  ahoraEnColombia,
  diaDeLaSemana,
  esPasado,
  horaFinDe,
  lunesDe,
  semanasDeLaVentana,
  sumarDias,
} from "./fechas.js";

const HORAS = new Set(HORAS_PERMITIDAS);
const clave = (fecha, horaInicio) => `${fecha}T${horaInicio}`;
const sabadoDe = (lunes) => sumarDias(lunes, DIAS_POR_SEMANA - 1);

// Los bloques que no están en las horas permitidas (datos antiguos, p. ej. 14:30)
// no se muestran ni se modifican.
const estaAlineado = (bloque) => HORAS.has(bloque.horaInicio);

const formatoDia = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

// "martes 4 de noviembre a las 3:00 p. m." (hora de Colombia).
const describirBloque = ({ fecha, horaInicio }) => {
  const [horas, minutos] = horaInicio.split(":").map(Number);
  const hora12 = horas % 12 === 0 ? 12 : horas % 12;
  const sufijo = horas < 12 ? "a. m." : horas === 12 ? "m." : "p. m.";
  const dia = formatoDia.format(new Date(`${fecha}T12:00:00Z`)).replace(",", "");
  return `${dia} a las ${hora12}:${String(minutos).padStart(2, "0")} ${sufijo}`;
};

const semanaFueraDeRango = () =>
  errorNegocio(
    "SEMANA_FUERA_DE_RANGO",
    "Solo puedes consultar o editar la semana actual y las 3 siguientes",
    400,
  );

const bloqueInvalido = (mensaje) => errorNegocio("BLOQUE_INVALIDO", mensaje, 400);

// Comprueba que `semana` sea el lunes de una semana de la ventana.
const validarSemana = (semana, semanas) => {
  if (diaDeLaSemana(semana) !== 0 || !semanas.includes(semana)) {
    throw semanaFueraDeRango();
  }
};

// Bloques activos y alineados de la semana, indexados por fecha y hora.
const indexarActivos = (filas) => {
  const activos = new Map();
  for (const fila of filas) {
    if (fila.activo && estaAlineado(fila) && !activos.has(clave(fila.fecha, fila.horaInicio))) {
      activos.set(clave(fila.fecha, fila.horaInicio), fila);
    }
  }
  return activos;
};

const armarSemana = ({ semana, semanas, filas, ahora }) => {
  const activos = indexarActivos(filas);
  const dias = Array.from({ length: DIAS_POR_SEMANA }, (_, indice) => {
    const fecha = sumarDias(semana, indice);
    return {
      fecha,
      bloques: HORAS_PERMITIDAS.map((horaInicio) => {
        const guardado = activos.get(clave(fecha, horaInicio));
        let estado = "no_disponible";
        if (guardado?.confirmado) estado = "confirmado";
        else if (esPasado(fecha, horaInicio, ahora)) estado = "pasado";
        else if (guardado) estado = "disponible";
        return { horaInicio, horaFin: horaFinDe(horaInicio), estado };
      }),
    };
  });

  return { semana, semanas, zonaHoraria: ZONA_HORARIA, dias };
};

export const obtenerMiSemana = async (tutorId, semanaPedida) => {
  const ahora = ahoraEnColombia();
  const semanas = semanasDeLaVentana(ahora);
  const semana = semanaPedida ? lunesDe(semanaPedida) : semanas[0];
  validarSemana(semana, semanas);

  const filas = await bloquesDeTutorEntre({
    tutorId,
    desde: semana,
    hasta: sabadoDe(semana),
  });
  return armarSemana({ semana, semanas, filas, ahora });
};

// Recibe la lista completa de bloques marcados de la semana y aplica la
// diferencia con lo guardado, todo o nada. Los bloques pasados no se tocan.
export const guardarMiSemana = async (tutorId, { semana, bloques }) => {
  const ahora = ahoraEnColombia();
  const semanas = semanasDeLaVentana(ahora);
  validarSemana(semana, semanas);
  const sabado = sabadoDe(semana);

  const deseados = new Map();
  for (const bloque of bloques) {
    if (bloque.fecha < semana || bloque.fecha > sabado) {
      throw bloqueInvalido(
        `El bloque del ${describirBloque(bloque)} no pertenece a la semana que estás editando`,
      );
    }
    const llave = clave(bloque.fecha, bloque.horaInicio);
    if (deseados.has(llave)) {
      throw bloqueInvalido(`El bloque del ${describirBloque(bloque)} está repetido`);
    }
    deseados.set(llave, bloque);
  }

  await prisma.$transaction(async (transaccion) => {
    const filas = await bloquesDeTutorEntre(
      { tutorId, desde: semana, hasta: sabado },
      transaccion,
    );
    const activos = indexarActivos(filas);
    const inactivos = new Map();
    for (const fila of filas) {
      const llave = clave(fila.fecha, fila.horaInicio);
      if (!fila.activo && estaAlineado(fila) && !inactivos.has(llave)) {
        inactivos.set(llave, fila);
      }
    }

    const crear = [];
    const reactivarIds = [];
    for (const [llave, bloque] of deseados) {
      if (activos.has(llave)) continue;
      if (esPasado(bloque.fecha, bloque.horaInicio, ahora)) {
        throw bloqueInvalido(
          `No puedes agregar el bloque del ${describirBloque(bloque)} porque ya pasó`,
        );
      }
      const inactivo = inactivos.get(llave);
      if (inactivo) reactivarIds.push(inactivo.id);
      else crear.push({ ...bloque, horaFin: horaFinDe(bloque.horaInicio) });
    }

    const borrarIds = [];
    const desactivarIds = [];
    for (const [llave, fila] of activos) {
      if (deseados.has(llave) || esPasado(fila.fecha, fila.horaInicio, ahora)) continue;
      if (fila.confirmado) {
        throw errorNegocio(
          "BLOQUE_CON_TUTORIA_CONFIRMADA",
          `No puedes modificar ni eliminar el bloque del ${describirBloque(fila)}: tiene una tutoría confirmada`,
          409,
        );
      }
      if (fila.cantidadSolicitudes > 0) desactivarIds.push(fila.id);
      else borrarIds.push(fila.id);
    }

    await aplicarCambiosDeSemana(
      { tutorId, crear, reactivarIds, borrarIds, desactivarIds },
      transaccion,
    );
  });

  return obtenerMiSemana(tutorId, semana);
};

// Bloques libres y futuros de la ventana, con la misma regla de visibilidad que
// el perfil de 008: 404 igual si no existe, no tiene materias aprobadas o es el
// propio usuario.
export const obtenerDisponibilidadPublica = async (usuarioId, tutorId) => {
  if (!(await esTutorVisible({ tutorId, usuarioId }))) {
    throw errorNegocio("TUTOR_NO_ENCONTRADO", "No encontramos este tutor", 404);
  }

  const ahora = ahoraEnColombia();
  const semanas = semanasDeLaVentana(ahora);
  const filas = await bloquesLibresDeTutor({
    tutorId,
    desde: semanas[0],
    hasta: sabadoDe(semanas.at(-1)),
  });

  const vistos = new Set();
  const bloques = [];
  for (const fila of filas) {
    const llave = clave(fila.fecha, fila.horaInicio);
    if (
      vistos.has(llave) ||
      !estaAlineado(fila) ||
      diaDeLaSemana(fila.fecha) >= DIAS_POR_SEMANA ||
      esPasado(fila.fecha, fila.horaInicio, ahora)
    ) {
      continue;
    }
    vistos.add(llave);
    bloques.push({
      fecha: fila.fecha,
      horaInicio: fila.horaInicio,
      horaFin: horaFinDe(fila.horaInicio),
    });
  }

  return { semanas, zonaHoraria: ZONA_HORARIA, bloques };
};
