import { prisma } from "../../shared/prisma/client.js";
import { buscarPorIds } from "../materias/materias.repository.js";

export const buscarMaterias = async (materiaIds) => buscarPorIds(materiaIds);

export const buscarSolicitudesDelTutor = async (tutorId, materiaIds) => {
  return prisma.tutores_materias.findMany({
    where: { tutorId, materiaId: { in: materiaIds } },
    select: { id: true, materiaId: true, estado: true },
  });
};

export const guardarEnvio = async (tutorId, datos, archivo) => {
  return prisma.$transaction(async (transaccion) => {
    const archivoGuardado = await transaccion.archivos_certificado.create({
      data: {
        usuarioId: tutorId,
        nombreOriginal: archivo.originalname,
        tipoMime: archivo.tipoReal,
        tamanoBytes: archivo.size,
        contenido: archivo.buffer,
      },
      select: { id: true },
    });

    for (const materia of datos.materias) {
      const solicitud = materia.solicitudPreviaId
        ? await transaccion.tutores_materias.update({
            where: { id: materia.solicitudPreviaId },
            data: {
              promedioAcademico: materia.promedio,
              descripcion: datos.descripcion ?? null,
              estado: "pendiente",
              revisadoPor: null,
              revisadoEn: null,
            },
            select: { id: true },
          })
        : await transaccion.tutores_materias.create({
            data: {
              tutorId,
              materiaId: materia.materiaId,
              promedioAcademico: materia.promedio,
              descripcion: datos.descripcion ?? null,
              estado: "pendiente",
            },
            select: { id: true },
          });

      await transaccion.documentos_verificacion.create({
        data: {
          tutorMateriaId: solicitud.id,
          archivoId: archivoGuardado.id,
          urlArchivo: `db://archivos_certificado/${archivoGuardado.id}`,
        },
        select: { id: true },
      });
    }

    return { solicitudes: datos.materias.length, archivoId: archivoGuardado.id };
  });
};

export const listarSolicitudesDelTutor = async (tutorId) => {
  return prisma.tutores_materias.findMany({
    where: { tutorId },
    select: {
      id: true,
      estado: true,
      creadoEn: true,
      descripcion: true,
      materias: { select: { id: true, nombre: true } },
    },
    orderBy: { creadoEn: "desc" },
  });
};
