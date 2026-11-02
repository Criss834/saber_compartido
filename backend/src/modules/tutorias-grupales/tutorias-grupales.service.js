import { prisma } from "../../shared/prisma/client.js";
import { errorNegocio } from "../../shared/errores/error-negocio.js";
import {
  ahoraEnColombia,
  diaLegible,
  esPasado,
  fechaHoraABd,
  horaLegible,
  sumarDias,
} from "../disponibilidad/fechas.js";
import { SEMANAS_VENTANA } from "../disponibilidad/disponibilidad.constantes.js";
import { HORA_FIN_MAXIMA } from "./tutorias-grupales.constantes.js";
import {
  horaDe,
  intervaloDeHoras,
  intervaloDeSesion,
  minutosDe,
  seCruzan,
} from "./intervalos.js";
import {
  bloquearTutor,
  bloquesActivosDeTutorEnDia,
  buscarSesion,
  insertarSesion,
  listarSesionesDeTutor,
  listarSesionesPublicas,
  materiasAprobadasDeTutor,
  sesionesVivasDeTutorEnDia,
  solicitudesVivasDeUsuarioEnDia,
} from "./tutorias-grupales.repository.js";

const DIAS_VENTANA = SEMANAS_VENTANA * 7;

const rango = (inicio, fin) => `${horaLegible(horaDe(inicio))} a ${horaLegible(horaDe(fin))}`;

const horarioInvalido = (mensaje) => errorNegocio("HORARIO_INVALIDO", mensaje, 400);
const choque = (mensaje) => errorNegocio("CHOQUE_DE_HORARIO", mensaje, 409);

// ---------------------------------------------------------------------------
// Vista pública de una sesión
// ---------------------------------------------------------------------------

const aVista = (sesion, ahora, { conTutor }) => {
  const intervalo = intervaloDeSesion(sesion);
  return {
    id: sesion.id,
    titulo: sesion.titulo,
    descripcion: sesion.descripcion,
    materia: { id: sesion.materia.id, nombre: sesion.materia.nombre },
    fecha: intervalo.fecha,
    horaInicio: intervalo.horaInicio,
    horaFin: intervalo.horaFin,
    duracionMinutos: sesion.duracionMinutos,
    cupo: sesion.cupo,
    inscritos: sesion.inscritos,
    disponibles: Math.max(sesion.cupo - sesion.inscritos, 0),
    estado: sesion.estado,
    pasada: esPasado(intervalo.fecha, intervalo.horaInicio, ahora),
    ...(conTutor
      ? {
          tutor: {
            id: sesion.tutor.id,
            nombreCompleto: `${sesion.tutor.nombres} ${sesion.tutor.apellidos}`.trim(),
          },
        }
      : {}),
  };
};

const momento = (vista) => `${vista.fecha}T${vista.horaInicio}`;

// ---------------------------------------------------------------------------
// Crear
// ---------------------------------------------------------------------------

const validarHorario = ({ fecha, horaInicio, duracionMinutos }, ahora) => {
  if (fecha < ahora.fecha || esPasado(fecha, horaInicio, ahora)) {
    throw horarioInvalido("La sesión debe empezar más tarde que la hora actual");
  }
  if (fecha > sumarDias(ahora.fecha, DIAS_VENTANA)) {
    throw horarioInvalido(`Solo puedes programar sesiones hasta ${SEMANAS_VENTANA} semanas adelante`);
  }
  if (minutosDe(horaInicio) + duracionMinutos > minutosDe(HORA_FIN_MAXIMA)) {
    throw horarioInvalido(
      `La sesión debe terminar a las ${horaLegible(HORA_FIN_MAXIMA)} como muy tarde`,
    );
  }
};

// Primer choque con la agenda del tutor (sesiones vivas, tutorías individuales
// vivas y bloques publicados), o null.
const buscarChoque = async (transaccion, tutorId, fecha, propuesta) => {
  const sesiones = await sesionesVivasDeTutorEnDia(transaccion, tutorId, fecha);
  for (const sesion of sesiones) {
    const otra = intervaloDeSesion(sesion);
    if (seCruzan(propuesta, otra)) {
      return `Se cruza con tu sesión grupal "${sesion.titulo}" (${rango(otra.inicio, otra.fin)})`;
    }
  }

  const solicitudes = await solicitudesVivasDeUsuarioEnDia(transaccion, tutorId, fecha);
  for (const solicitud of solicitudes) {
    const otra = intervaloDeHoras(solicitud.disponibilidad_tutores);
    if (seCruzan(propuesta, otra)) {
      const estado = solicitud.estado === "aceptada" ? "confirmada" : "pendiente";
      const papel = solicitud.tutorId === tutorId ? "que das" : "que recibes";
      return `Se cruza con una tutoría individual ${estado} ${papel} de ${solicitud.materias.nombre} (${rango(otra.inicio, otra.fin)})`;
    }
  }

  const bloques = (await bloquesActivosDeTutorEnDia(transaccion, tutorId, fecha))
    .map(intervaloDeHoras)
    .filter((bloque) => seCruzan(propuesta, bloque));
  if (bloques.length > 0) {
    const lista = bloques.map((bloque) => horaLegible(bloque.horaInicio)).join(", ");
    return `Se cruza con tu disponibilidad publicada el ${diaLegible(fecha)} (${bloques.length === 1 ? "bloque" : "bloques"} de las ${lista}). ${bloques.length === 1 ? "Quítalo" : "Quítalos"} en "Mi disponibilidad" o elige otra hora`;
  }

  return null;
};

export const crearSesion = async (tutorId, datos) => {
  const ahora = ahoraEnColombia();
  const { titulo, materiaId, fecha, horaInicio, duracionMinutos, cupo, descripcion } = datos;

  const materias = await materiasAprobadasDeTutor(tutorId);
  if (!materias.some((materia) => materia.id === materiaId)) {
    throw errorNegocio("MATERIA_NO_OFRECIDA", "No tienes aprobada esa materia", 400);
  }

  validarHorario({ fecha, horaInicio, duracionMinutos }, ahora);
  const inicio = minutosDe(horaInicio);
  const propuesta = { inicio, fin: inicio + duracionMinutos };

  const sesionId = await prisma.$transaction(async (transaccion) => {
    await bloquearTutor(transaccion, tutorId);
    const conflicto = await buscarChoque(transaccion, tutorId, fecha, propuesta);
    if (conflicto) throw choque(conflicto);

    const creada = await insertarSesion(transaccion, {
      tutorId,
      materiaId,
      titulo,
      descripcion: descripcion ?? null,
      fechaHoraSesion: fechaHoraABd(fecha, horaInicio),
      duracionMinutos,
      cupo,
    });
    return creada.id;
  });

  return aVista(await buscarSesion(sesionId), ahora, { conTutor: false });
};

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export const listarMateriasParaSesion = async (tutorId) => ({
  materias: await materiasAprobadasDeTutor(tutorId),
});

// Primero las próximas (la más cercana arriba) y después las pasadas (la más
// reciente arriba).
export const listarMisSesiones = async (tutorId) => {
  const ahora = ahoraEnColombia();
  const vistas = (await listarSesionesDeTutor(tutorId)).map((sesion) =>
    aVista(sesion, ahora, { conTutor: false }),
  );
  const proximas = vistas.filter((v) => !v.pasada).sort((a, b) => momento(a).localeCompare(momento(b)));
  const pasadas = vistas.filter((v) => v.pasada).sort((a, b) => momento(b).localeCompare(momento(a)));
  return { sesiones: [...proximas, ...pasadas] };
};

export const listarPublicas = async (usuarioId) => {
  const ahora = ahoraEnColombia();
  const sesiones = await listarSesionesPublicas({
    usuarioId,
    desde: fechaHoraABd(ahora.fecha, ahora.hora),
  });
  return { sesiones: sesiones.map((sesion) => aVista(sesion, ahora, { conTutor: true })) };
};
