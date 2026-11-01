import { extraerDatosCertificado } from "./proveedor-ia.js";
import { generarAlertas, materiaCoincide } from "./comparar.js";
import { errorNegocio } from "../../../shared/errores/error-negocio.js";
import { prisma } from "../../../shared/prisma/client.js";
import {
  actualizarResultadoIA,
  buscarCertificadoDeSolicitud,
  buscarSolicitudesPorArchivo,
  buscarVerificacion,
  cargarArchivo,
  listarVerificacionesPendientes,
} from "./verificacion.repository.js";

const enProceso = new Set();

const aNumero = (valor) => (valor === null || valor === undefined ? null : Number(valor));

const indicadorDe = (documento) => {
  const procesada = Boolean(documento?.iaProcesadoEn);
  const alertas = Array.isArray(documento?.iaAlertas)
    ? documento.iaAlertas
    : [];
  const requiereRevision = !procesada || alertas.length > 0;
  return requiereRevision ? "Requiere revisión manual" : "Pendiente de revisión";
};

export const listarVerificaciones = async () => {
  const solicitudes = await listarVerificacionesPendientes();
  return solicitudes.map((solicitud) => {
    const cuenta =
      solicitud.usuarios_tutores_materias_tutor_idTousuarios;
    const documento = solicitud.documentos_verificacion?.[0] ?? null;
    return {
      id: solicitud.id,
      cuenta: {
        nombres: cuenta.nombres,
        apellidos: cuenta.apellidos,
      },
      materia: solicitud.materias.nombre,
      promedioAcademico: aNumero(solicitud.promedioAcademico),
      creadoEn: solicitud.creadoEn,
      indicador: indicadorDe(documento),
    };
  });
};

export const obtenerVerificacion = async (solicitudId) => {
  const solicitud = await buscarVerificacion(solicitudId);
  if (!solicitud) {
    throw errorNegocio(
      "VERIFICACION_NO_ENCONTRADA",
      "La solicitud no existe",
      404,
    );
  }

  const cuenta =
    solicitud.usuarios_tutores_materias_tutor_idTousuarios;
  const documento = solicitud.documentos_verificacion ?? null;

  return {
    id: solicitud.id,
    estado: solicitud.estado,
    cuenta: {
      id: cuenta.id,
      nombres: cuenta.nombres,
      apellidos: cuenta.apellidos,
    },
    materia: solicitud.materias.nombre,
    promedioAcademico: aNumero(solicitud.promedioAcademico),
    creadoEn: solicitud.creadoEn,
    descripcion: solicitud.descripcion,
    indicador: indicadorDe(documento),
    extraido: documento
      ? {
          nombre: documento.iaNombreExtraido,
          primerApellido: documento.iaPrimerApellidoExtraido,
          segundoApellido: documento.iaSegundoApellidoExtraido,
          materia: documento.iaMateriaExtraida,
          promedio: aNumero(documento.iaPromedioExtraido),
          firmaDetectada: documento.iaFirmaDetectada,
          procesadoEn: documento.iaProcesadoEn,
        }
      : null,
    alertas: Array.isArray(documento?.iaAlertas) ? documento.iaAlertas : [],
  };
};

export const obtenerCertificado = async (solicitudId) => {
  const certificado = await buscarCertificadoDeSolicitud(solicitudId);
  if (!certificado) {
    throw errorNegocio(
      "CERTIFICADO_NO_ENCONTRADO",
      "El certificado no existe",
      404,
    );
  }
  return certificado;
};

export const resolverVerificacion = async (solicitudId, decision, administradorId) => {
  const solicitud = await buscarVerificacion(solicitudId);
  if (!solicitud) {
    throw errorNegocio(
      "VERIFICACION_NO_ENCONTRADA",
      "La solicitud no existe",
      404,
    );
  }
  if (solicitud.estado !== "pendiente") {
    throw errorNegocio(
      "SOLICITUD_YA_RESUELTA",
      "La solicitud ya fue resuelta",
      409,
    );
  }

  return resolverEnTransaccion(solicitudId, decision, administradorId);
};

const resolverEnTransaccion = async (solicitudId, decision, administradorId) => {
  return prisma.$transaction(async (transaccion) => {
    const actualizada = await transaccion.tutores_materias.updateMany({
      where: { id: solicitudId, estado: "pendiente" },
      data: {
        estado: decision,
        revisadoPor: administradorId,
        revisadoEn: new Date(),
      },
    });

    if (actualizada.count === 0) {
      throw errorNegocio(
        "SOLICITUD_YA_RESUELTA",
        "La solicitud ya fue resuelta",
        409,
      );
    }

    if (decision === "aprobado") {
      const solicitud = await transaccion.tutores_materias.findUnique({
        where: { id: solicitudId },
        select: { tutorId: true },
      });
      await transaccion.usuarios.updateMany({
        where: { id: solicitud.tutorId, rol: "estudiante" },
        data: { rol: "tutor" },
      });
    }

    return { id: solicitudId, estado: decision };
  });
};

export const reprocesarVerificacion = async (solicitudId) => {
  const solicitud = await buscarVerificacion(solicitudId);
  if (!solicitud) {
    throw errorNegocio(
      "VERIFICACION_NO_ENCONTRADA",
      "La solicitud no existe",
      404,
    );
  }

  const documento = solicitud.documentos_verificacion;
  if (!documento?.archivoId) {
    throw errorNegocio(
      "CERTIFICADO_NO_ENCONTRADO",
      "La solicitud no tiene certificado asociado",
      404,
    );
  }

  void procesarArchivo(documento.archivoId);
  return { id: solicitudId, reprocesando: true };
};

export const procesarArchivo = async (archivoId) => {
  if (!archivoId || enProceso.has(archivoId)) return;
  enProceso.add(archivoId);

  try {
    const archivo = await cargarArchivo(archivoId);
    if (!archivo) {
      console.error(`Archivo ${archivoId} no encontrado; no se procesa`);
      return;
    }

    const documentos = await buscarSolicitudesPorArchivo(archivoId);
    if (documentos.length === 0) return;

    const extraccion = await extraerDatosCertificado({
      bytes: archivo.contenido,
      mime: archivo.tipoMime,
    });

    const procesadoEn = new Date();

    for (const documento of documentos) {
      const solicitud = documento.tutores_materias;
      const cuenta =
        solicitud.usuarios_tutores_materias_tutor_idTousuarios;
      const materia = solicitud.materias;

      const materiaExtraida = extraccion.materias.find((extraida) =>
        materiaCoincide(materia.nombre, extraida.nombre),
      );

      const alertas = generarAlertas({
        procesado: true,
        cuenta,
        extraccion,
        solicitud: {
          materiaNombre: materia.nombre,
          promedioAcademico: solicitud.promedioAcademico,
        },
      });

      await actualizarResultadoIA(documento.id, {
        nombreExtraido: extraccion.nombre,
        primerApellidoExtraido: extraccion.primerApellido,
        segundoApellidoExtraido: extraccion.segundoApellido,
        materiaExtraida: materiaExtraida?.nombre ?? null,
        promedioExtraido: materiaExtraida?.nota ?? null,
        firmaDetectada: extraccion.firmaDetectada,
        alertas,
        procesadoEn,
      });
    }
  } catch (error) {
    console.error(
      `No se pudo procesar el archivo ${archivoId} con la IA: ${error.message}`,
    );
  } finally {
    enProceso.delete(archivoId);
  }
};

export default procesarArchivo;
