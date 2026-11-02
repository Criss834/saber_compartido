import { prisma } from "../../shared/prisma/client.js";
import { ESTADOS_VIVOS } from "./solicitudes.constantes.js";

const APROBADO = "aprobado";

// ---------------------------------------------------------------------------
// Crear (todas reciben el cliente de la transacción)
// ---------------------------------------------------------------------------

// Bloquea la fila del bloque hasta el final de la transacción: dos solicitudes
// simultáneas al mismo bloque se serializan aquí (disponibilidad_id no es UNIQUE).
export const bloquearBloque = (transaccion, disponibilidadId) =>
  transaccion.$queryRaw`SELECT id FROM disponibilidad_tutores WHERE id = ${disponibilidadId} FOR UPDATE`;

export const buscarBloque = (transaccion, disponibilidadId) =>
  transaccion.disponibilidad_tutores.findUnique({
    where: { id: disponibilidadId },
    select: { id: true, tutorId: true, fecha: true, horaInicio: true, horaFin: true, activo: true },
  });

export const bloqueTieneSolicitudViva = async (transaccion, disponibilidadId) =>
  Boolean(
    await transaccion.solicitudes_tutoria.findFirst({
      where: { disponibilidadId, estado: { in: ESTADOS_VIVOS } },
      select: { id: true },
    }),
  );

export const estudianteTieneChoque = async (transaccion, estudianteId, fechaHoraSolicitud) =>
  Boolean(
    await transaccion.solicitudes_tutoria.findFirst({
      where: { estudianteId, fechaHoraSolicitud, estado: { in: ESTADOS_VIVOS } },
      select: { id: true },
    }),
  );

export const materiaAprobadaDeTutor = (transaccion, tutorId, materiaId) =>
  transaccion.tutores_materias.findFirst({
    where: { tutorId, materiaId, estado: APROBADO },
    select: { materias: { select: { id: true, nombre: true } } },
  });

export const insertarSolicitud = (transaccion, datos) =>
  transaccion.solicitudes_tutoria.create({ data: datos, select: { id: true } });

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

const persona = { select: { id: true, nombres: true, apellidos: true, correoInstitucional: true } };

const seleccionSolicitud = {
  id: true,
  estudianteId: true,
  tutorId: true,
  estado: true,
  metodoPago: true,
  mensaje: true,
  motivoRechazo: true,
  fechaHoraSolicitud: true,
  creadoEn: true,
  respondidoEn: true,
  materias: { select: { id: true, nombre: true } },
  disponibilidad_tutores: { select: { fecha: true, horaInicio: true, horaFin: true } },
  usuarios_solicitudes_tutoria_estudiante_idTousuarios: persona,
  usuarios_solicitudes_tutoria_tutor_idTousuarios: persona,
};

const aSolicitud = (fila) => ({
  id: fila.id,
  estudianteId: fila.estudianteId,
  tutorId: fila.tutorId,
  estado: fila.estado,
  metodoPago: fila.metodoPago,
  mensaje: fila.mensaje,
  motivoRechazo: fila.motivoRechazo,
  fechaHoraSolicitud: fila.fechaHoraSolicitud,
  creadoEn: fila.creadoEn,
  respondidoEn: fila.respondidoEn,
  materia: fila.materias,
  bloque: fila.disponibilidad_tutores,
  estudiante: fila.usuarios_solicitudes_tutoria_estudiante_idTousuarios,
  tutor: fila.usuarios_solicitudes_tutoria_tutor_idTousuarios,
});

export const buscarSolicitud = async (id) => {
  const fila = await prisma.solicitudes_tutoria.findUnique({
    where: { id },
    select: seleccionSolicitud,
  });
  return fila ? aSolicitud(fila) : null;
};

export const listarSolicitudes = async ({ estudianteId, tutorId, estado }) => {
  const filas = await prisma.solicitudes_tutoria.findMany({
    where: {
      ...(estudianteId ? { estudianteId } : {}),
      ...(tutorId ? { tutorId } : {}),
      ...(estado ? { estado } : {}),
    },
    select: seleccionSolicitud,
  });
  return filas.map(aSolicitud);
};

// Pendientes de un tutor cuyo horario aún no ha empezado.
export const contarPendientesFuturas = (tutorId, desde) =>
  prisma.solicitudes_tutoria.count({
    where: { tutorId, estado: "pendiente", fechaHoraSolicitud: { gt: desde } },
  });

// ---------------------------------------------------------------------------
// Responder
// ---------------------------------------------------------------------------

// Solo cambia la solicitud si sigue pendiente y es del tutor: dos respuestas
// simultáneas no se pisan (el mismo patrón de la verificación de 007).
export const responderSiPendiente = async (id, tutorId, datos) => {
  const resultado = await prisma.solicitudes_tutoria.updateMany({
    where: { id, tutorId, estado: "pendiente" },
    data: { ...datos, respondidoEn: new Date() },
  });
  return resultado.count === 1;
};
