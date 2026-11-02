import { prisma } from "../../shared/prisma/client.js";
import { esTutorVisible } from "../busqueda/busqueda.repository.js";
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
import { HORA_FIN_MAXIMA, INSCRIPCION_CONFIRMADA, MODALIDADES } from "./tutorias-grupales.constantes.js";
import {
  horaDe,
  intervaloDeHoras,
  intervaloDeSesion,
  minutosDe,
  seCruzan,
} from "./intervalos.js";
import {
  bloquearSesion,
  bloquearTutor,
  buscarInscripcion,
  confirmarInscripcion,
  contarConfirmadas,
  leerSesionParaInscribir,
  listarInscritosDeSesion,
  listarSesionesInscritas,
  marcarLlena,
  sesionesInscritasEnDia,
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
    modalidad: { clave: sesion.modalidad, etiqueta: MODALIDADES[sesion.modalidad] },
    cupo: sesion.cupo,
    inscritos: sesion.inscritos,
    disponibles: Math.max(sesion.cupo - sesion.inscritos, 0),
    estado: sesion.estado,
    pasada: esPasado(intervalo.fecha, intervalo.horaInicio, ahora),
    ...(sesion.inscrito === undefined ? {} : { inscrito: sesion.inscrito }),
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
  const { titulo, materiaId, fecha, horaInicio, duracionMinutos, modalidad, cupo, descripcion } = datos;

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
      modalidad,
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

// ---------------------------------------------------------------------------
// Inscripción (012)
// ---------------------------------------------------------------------------

const noDisponible = () =>
  errorNegocio("SESION_NO_DISPONIBLE", "Esta sesión ya no está disponible para inscripción", 409);

// Primer choque de la agenda del usuario con la sesión (sesiones a las que ya
// está inscrito, sesiones que publicó como tutor y tutorías individuales vivas).
const buscarChoqueDeInscripcion = async (transaccion, usuarioId, sesion) => {
  const propuesta = intervaloDeSesion(sesion);
  const { fecha } = propuesta;

  for (const otra of await sesionesInscritasEnDia(transaccion, usuarioId, fecha)) {
    const intervalo = intervaloDeSesion(otra);
    if (otra.id !== sesion.id && seCruzan(propuesta, intervalo)) {
      return `Se cruza con la sesión grupal "${otra.titulo}" a la que ya estás inscrito (${rango(intervalo.inicio, intervalo.fin)})`;
    }
  }

  for (const propia of await sesionesVivasDeTutorEnDia(transaccion, usuarioId, fecha)) {
    const intervalo = intervaloDeSesion(propia);
    if (seCruzan(propuesta, intervalo)) {
      return `Se cruza con tu sesión grupal "${propia.titulo}" (${rango(intervalo.inicio, intervalo.fin)})`;
    }
  }

  for (const solicitud of await solicitudesVivasDeUsuarioEnDia(transaccion, usuarioId, fecha)) {
    const intervalo = intervaloDeHoras(solicitud.disponibilidad_tutores);
    if (seCruzan(propuesta, intervalo)) {
      const estado = solicitud.estado === "aceptada" ? "confirmada" : "pendiente";
      const papel = solicitud.tutorId === usuarioId ? "que das" : "que recibes";
      return `Se cruza con una tutoría individual ${estado} ${papel} de ${solicitud.materias.nombre} (${rango(intervalo.inicio, intervalo.fin)})`;
    }
  }

  return null;
};

export const inscribirse = async (estudianteId, sesionId) => {
  const ahora = ahoraEnColombia();

  await prisma.$transaction(async (transaccion) => {
    // Primero el bloqueo: lo que se cuenta después ya incluye las inscripciones
    // que otra transacción haya confirmado sobre esta sesión.
    await bloquearSesion(transaccion, sesionId);
    const sesion = await leerSesionParaInscribir(transaccion, sesionId);
    if (!sesion) throw noDisponible();

    const intervalo = intervaloDeSesion(sesion);
    const vigente =
      (sesion.estado === "abierta" || sesion.estado === "llena") &&
      !esPasado(intervalo.fecha, intervalo.horaInicio, ahora);
    if (!vigente) throw noDisponible();

    if (sesion.tutorId === estudianteId) {
      throw errorNegocio("SESION_PROPIA", "No puedes inscribirte a una sesión que tú publicaste", 409);
    }
    if (!(await esTutorVisible({ tutorId: sesion.tutorId, usuarioId: estudianteId }))) {
      throw noDisponible();
    }

    const existente = await buscarInscripcion(transaccion, sesionId, estudianteId);
    if (existente?.estado === INSCRIPCION_CONFIRMADA) {
      throw errorNegocio("YA_INSCRITO", "Ya estás inscrito en esta sesión", 409);
    }

    const confirmadas = await contarConfirmadas(transaccion, sesionId);
    if (sesion.estado === "llena" || confirmadas >= sesion.cupo) {
      throw errorNegocio("SESION_LLENA", "Esta sesión ya no tiene cupos disponibles", 409);
    }

    const conflicto = await buscarChoqueDeInscripcion(transaccion, estudianteId, sesion);
    if (conflicto) throw choque(conflicto);

    await confirmarInscripcion(transaccion, sesionId, estudianteId, existente);
    if (confirmadas + 1 >= sesion.cupo) await marcarLlena(transaccion, sesionId);
  });

  const actualizada = await buscarSesion(sesionId);
  return aVista({ ...actualizada, inscrito: true }, ahora, { conTutor: true });
};

export const listarMisInscripciones = async (usuarioId) => {
  const ahora = ahoraEnColombia();
  const sesiones = await listarSesionesInscritas({
    usuarioId,
    desde: fechaHoraABd(ahora.fecha, ahora.hora),
  });
  return {
    sesiones: sesiones.map((sesion) => aVista({ ...sesion, inscrito: true }, ahora, { conTutor: true })),
  };
};

// Solo el tutor de la sesión ve quiénes se inscribieron (con su correo, para
// enviarles el enlace o el lugar). Mismo 404 si no existe o es de otro tutor.
export const listarInscritos = async (tutorId, sesionId) => {
  const sesion = await buscarSesion(sesionId);
  if (!sesion || sesion.tutorId !== tutorId) {
    throw errorNegocio("SESION_NO_ENCONTRADA", "No encontramos esta sesión", 404);
  }
  const filas = await listarInscritosDeSesion(sesionId);
  return {
    inscritos: filas.map((fila) => ({
      nombreCompleto: `${fila.usuarios.nombres} ${fila.usuarios.apellidos}`.trim(),
      correo: fila.usuarios.correoInstitucional,
      inscritoEn: fila.inscritoEn,
    })),
  };
};
