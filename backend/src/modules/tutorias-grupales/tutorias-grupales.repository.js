import { prisma } from "../../shared/prisma/client.js";
import { ESTADOS_VIVOS as ESTADOS_SOLICITUD_VIVOS } from "../solicitudes/solicitudes.constantes.js";
import { fechaABd, sumarDias } from "../disponibilidad/fechas.js";
import { ESTADOS_VIVOS, INSCRIPCION_CONFIRMADA } from "./tutorias-grupales.constantes.js";

const APROBADO = "aprobado";

// Rango [fecha 00:00, fecha+1 00:00) para columnas DATETIME guardadas en hora de
// Colombia con la convención UTC (009/010).
const delDia = (fecha) => ({ gte: fechaABd(fecha), lt: fechaABd(sumarDias(fecha, 1)) });

// ---------------------------------------------------------------------------
// Crear (las que reciben `transaccion` se usan dentro de la misma transacción)
// ---------------------------------------------------------------------------

export const materiasAprobadasDeTutor = async (tutorId, cliente = prisma) => {
  const filas = await cliente.tutores_materias.findMany({
    where: { tutorId, estado: APROBADO },
    select: { materias: { select: { id: true, nombre: true } } },
    orderBy: { materias: { nombre: "asc" } },
  });
  return filas.map((fila) => fila.materias);
};

// Serializa las publicaciones de un mismo tutor: dos sesiones creadas a la vez
// no pueden cruzarse entre sí.
export const bloquearTutor = (transaccion, tutorId) =>
  transaccion.$queryRaw`SELECT id FROM usuarios WHERE id = ${tutorId} FOR UPDATE`;

export const sesionesVivasDeTutorEnDia = (transaccion, tutorId, fecha) =>
  transaccion.sesiones_grupales.findMany({
    where: { tutorId, estado: { in: ESTADOS_VIVOS }, fechaHoraSesion: delDia(fecha) },
    select: { id: true, titulo: true, fechaHoraSesion: true, duracionMinutos: true },
  });

// Tutorías individuales vivas del usuario ese día, como tutor o como estudiante.
export const solicitudesVivasDeUsuarioEnDia = (transaccion, usuarioId, fecha) =>
  transaccion.solicitudes_tutoria.findMany({
    where: {
      OR: [{ tutorId: usuarioId }, { estudianteId: usuarioId }],
      estado: { in: ESTADOS_SOLICITUD_VIVOS },
      fechaHoraSolicitud: delDia(fecha),
    },
    select: {
      estado: true,
      tutorId: true,
      materias: { select: { nombre: true } },
      disponibilidad_tutores: { select: { horaInicio: true, horaFin: true } },
    },
  });

export const bloquesActivosDeTutorEnDia = (transaccion, tutorId, fecha) =>
  transaccion.disponibilidad_tutores.findMany({
    where: { tutorId, activo: true, fecha: fechaABd(fecha) },
    select: { horaInicio: true, horaFin: true },
    orderBy: { horaInicio: "asc" },
  });

export const insertarSesion = (transaccion, datos) =>
  transaccion.sesiones_grupales.create({ data: datos, select: { id: true } });

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

const seleccionSesion = {
  id: true,
  tutorId: true,
  titulo: true,
  descripcion: true,
  fechaHoraSesion: true,
  duracionMinutos: true,
  modalidad: true,
  cupo: true,
  estado: true,
  materias: { select: { id: true, nombre: true } },
  usuarios: { select: { id: true, nombres: true, apellidos: true } },
  _count: {
    select: {
      inscripciones_sesion_grupal: { where: { estado: INSCRIPCION_CONFIRMADA } },
    },
  },
};

const aSesion = (fila) => ({
  id: fila.id,
  tutorId: fila.tutorId,
  titulo: fila.titulo,
  descripcion: fila.descripcion,
  fechaHoraSesion: fila.fechaHoraSesion,
  duracionMinutos: fila.duracionMinutos,
  modalidad: fila.modalidad,
  cupo: fila.cupo,
  estado: fila.estado,
  materia: fila.materias,
  tutor: fila.usuarios,
  inscritos: fila._count.inscripciones_sesion_grupal,
});

export const buscarSesion = async (id) => {
  const fila = await prisma.sesiones_grupales.findUnique({ where: { id }, select: seleccionSesion });
  return fila ? aSesion(fila) : null;
};

export const listarSesionesDeTutor = async (tutorId) => {
  const filas = await prisma.sesiones_grupales.findMany({
    where: { tutorId },
    select: seleccionSesion,
  });
  return filas.map(aSesion);
};

// Sesiones abiertas o llenas (012) que aún no empiezan, de tutores visibles (al
// menos una materia aprobada, regla de 008) y distintas del usuario, con
// `inscrito` = si el usuario tiene una inscripción confirmada en cada una.
export const listarSesionesPublicas = async ({ usuarioId, desde }) => {
  const filas = await prisma.sesiones_grupales.findMany({
    where: {
      estado: { in: ESTADOS_VIVOS },
      fechaHoraSesion: { gt: desde },
      tutorId: { not: usuarioId },
      usuarios: {
        tutores_materias_tutores_materias_tutor_idTousuarios: { some: { estado: APROBADO } },
      },
    },
    select: {
      ...seleccionSesion,
      inscripciones_sesion_grupal: {
        where: { estudianteId: usuarioId, estado: INSCRIPCION_CONFIRMADA },
        select: { id: true },
      },
    },
    orderBy: { fechaHoraSesion: "asc" },
  });
  return filas.map((fila) => ({
    ...aSesion(fila),
    inscrito: fila.inscripciones_sesion_grupal.length > 0,
  }));
};

// Sesiones vivas de un tutor entre dos fechas (inclusive), para "Mi disponibilidad".
export const sesionesVivasDeTutorEntre = (tutorId, desde, hasta) =>
  prisma.sesiones_grupales.findMany({
    where: {
      tutorId,
      estado: { in: ESTADOS_VIVOS },
      fechaHoraSesion: { gte: fechaABd(desde), lt: fechaABd(sumarDias(hasta, 1)) },
    },
    select: { titulo: true, fechaHoraSesion: true, duracionMinutos: true },
  });

// ---------------------------------------------------------------------------
// Inscripción (012). Las que reciben `transaccion` van dentro de la misma
// transacción, después de bloquear la sesión.
// ---------------------------------------------------------------------------

// Serializa las inscripciones a una misma sesión: el cupo nunca se supera.
export const bloquearSesion = (transaccion, sesionId) =>
  transaccion.$queryRaw`SELECT id FROM sesiones_grupales WHERE id = ${sesionId} FOR UPDATE`;

export const leerSesionParaInscribir = (transaccion, sesionId) =>
  transaccion.sesiones_grupales.findUnique({
    where: { id: sesionId },
    select: {
      id: true,
      tutorId: true,
      titulo: true,
      fechaHoraSesion: true,
      duracionMinutos: true,
      cupo: true,
      estado: true,
    },
  });

export const contarConfirmadas = (transaccion, sesionId) =>
  transaccion.inscripciones_sesion_grupal.count({
    where: { sesionGrupalId: sesionId, estado: INSCRIPCION_CONFIRMADA },
  });

export const buscarInscripcion = (transaccion, sesionId, estudianteId) =>
  transaccion.inscripciones_sesion_grupal.findUnique({
    where: { sesionGrupalId_estudianteId: { sesionGrupalId: sesionId, estudianteId } },
    select: { id: true, estado: true },
  });

export const confirmarInscripcion = (transaccion, sesionId, estudianteId, existente) =>
  existente
    ? transaccion.inscripciones_sesion_grupal.update({
        where: { id: existente.id },
        data: { estado: INSCRIPCION_CONFIRMADA, inscritoEn: new Date() },
      })
    : transaccion.inscripciones_sesion_grupal.create({
        data: { sesionGrupalId: sesionId, estudianteId, estado: INSCRIPCION_CONFIRMADA },
      });

export const marcarLlena = (transaccion, sesionId) =>
  transaccion.sesiones_grupales.update({ where: { id: sesionId }, data: { estado: "llena" } });

// Sesiones vivas de un día a las que el usuario está inscrito (para choques).
export const sesionesInscritasEnDia = (transaccion, usuarioId, fecha) =>
  transaccion.sesiones_grupales.findMany({
    where: {
      estado: { in: ESTADOS_VIVOS },
      fechaHoraSesion: delDia(fecha),
      inscripciones_sesion_grupal: {
        some: { estudianteId: usuarioId, estado: INSCRIPCION_CONFIRMADA },
      },
    },
    select: { id: true, titulo: true, fechaHoraSesion: true, duracionMinutos: true },
  });

// Sesiones futuras a las que el usuario está inscrito, por fecha.
export const listarSesionesInscritas = async ({ usuarioId, desde }) => {
  const filas = await prisma.sesiones_grupales.findMany({
    where: {
      estado: { in: ESTADOS_VIVOS },
      fechaHoraSesion: { gt: desde },
      inscripciones_sesion_grupal: {
        some: { estudianteId: usuarioId, estado: INSCRIPCION_CONFIRMADA },
      },
    },
    select: seleccionSesion,
    orderBy: { fechaHoraSesion: "asc" },
  });
  return filas.map(aSesion);
};

export const listarInscritosDeSesion = (sesionId) =>
  prisma.inscripciones_sesion_grupal.findMany({
    where: { sesionGrupalId: sesionId, estado: INSCRIPCION_CONFIRMADA },
    select: {
      inscritoEn: true,
      usuarios: { select: { nombres: true, apellidos: true, correoInstitucional: true } },
    },
    orderBy: { inscritoEn: "asc" },
  });
