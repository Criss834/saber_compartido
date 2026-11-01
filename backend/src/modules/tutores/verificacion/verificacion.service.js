import { extraerDatosCertificado } from "./proveedor-ia.js";
import { generarAlertas, materiaCoincide } from "./comparar.js";
import {
  actualizarResultadoIA,
  buscarSolicitudesPorArchivo,
  cargarArchivo,
} from "./verificacion.repository.js";

const enProceso = new Set();

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
