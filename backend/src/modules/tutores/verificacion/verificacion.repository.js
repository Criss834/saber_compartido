import { prisma } from "../../../shared/prisma/client.js";

export const cargarArchivo = async (archivoId) => {
  return prisma.archivos_certificado.findUnique({
    where: { id: archivoId },
    select: { id: true, tipoMime: true, contenido: true },
  });
};

export const buscarSolicitudesPorArchivo = async (archivoId) => {
  return prisma.documentos_verificacion.findMany({
    where: { archivoId },
    select: {
      id: true,
      tutorMateriaId: true,
      tutores_materias: {
        select: {
          id: true,
          promedioAcademico: true,
          estado: true,
          usuarios_tutores_materias_tutor_idTousuarios: {
            select: { id: true, nombres: true, apellidos: true },
          },
          materias: { select: { id: true, nombre: true } },
        },
      },
    },
  });
};

export const buscarUltimoDocumentoDeSolicitud = async (solicitudId) => {
  return prisma.documentos_verificacion.findFirst({
    where: { tutorMateriaId: solicitudId },
    orderBy: { subidoEn: "desc" },
    select: {
      id: true,
      archivoId: true,
      iaNombreExtraido: true,
      iaPrimerApellidoExtraido: true,
      iaSegundoApellidoExtraido: true,
      iaMateriaExtraida: true,
      iaPromedioExtraido: true,
      iaFirmaDetectada: true,
      iaAlertas: true,
      iaProcesadoEn: true,
      subidoEn: true,
    },
  });
};

export const actualizarResultadoIA = async (documentoId, resultado) => {
  return prisma.documentos_verificacion.update({
    where: { id: documentoId },
    data: {
      iaNombreExtraido: resultado.nombreExtraido,
      iaPrimerApellidoExtraido: resultado.primerApellidoExtraido,
      iaSegundoApellidoExtraido: resultado.segundoApellidoExtraido,
      iaMateriaExtraida: resultado.materiaExtraida,
      iaPromedioExtraido: resultado.promedioExtraido,
      iaFirmaDetectada: resultado.firmaDetectada,
      iaAlertas: resultado.alertas,
      iaProcesadoEn: resultado.procesadoEn,
    },
    select: { id: true },
  });
};

export const listarVerificacionesPendientes = async () => {
  return prisma.tutores_materias.findMany({
    where: { estado: "pendiente" },
    select: {
      id: true,
      promedioAcademico: true,
      creadoEn: true,
      usuarios_tutores_materias_tutor_idTousuarios: {
        select: { nombres: true, apellidos: true },
      },
      materias: { select: { nombre: true } },
      documentos_verificacion: {
        orderBy: { subidoEn: "desc" },
        take: 1,
        select: {
          iaAlertas: true,
          iaProcesadoEn: true,
        },
      },
    },
    orderBy: { creadoEn: "asc" },
  });
};

export const buscarVerificacion = async (solicitudId) => {
  return prisma.tutores_materias.findUnique({
    where: { id: solicitudId },
    select: {
      id: true,
      estado: true,
      promedioAcademico: true,
      creadoEn: true,
      descripcion: true,
      revisadoPor: true,
      revisadoEn: true,
      usuarios_tutores_materias_tutor_idTousuarios: {
        select: { id: true, nombres: true, apellidos: true },
      },
      materias: { select: { id: true, nombre: true } },
      documentos_verificacion: {
        orderBy: { subidoEn: "desc" },
        take: 1,
        select: {
          id: true,
          archivoId: true,
          iaNombreExtraido: true,
          iaPrimerApellidoExtraido: true,
          iaSegundoApellidoExtraido: true,
          iaMateriaExtraida: true,
          iaPromedioExtraido: true,
          iaFirmaDetectada: true,
          iaAlertas: true,
          iaProcesadoEn: true,
          subidoEn: true,
        },
      },
    },
  });
};

export const buscarCertificadoDeSolicitud = async (solicitudId) => {
  const documento = await prisma.documentos_verificacion.findFirst({
    where: { tutorMateriaId: solicitudId },
    orderBy: { subidoEn: "desc" },
    select: { archivoId: true },
  });
  if (!documento?.archivoId) return null;

  return prisma.archivos_certificado.findUnique({
    where: { id: documento.archivoId },
    select: { tipoMime: true, nombreOriginal: true, contenido: true },
  });
};
