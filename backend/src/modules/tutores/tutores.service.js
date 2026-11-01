import { errorNegocio } from "../../shared/errores/error-negocio.js";
import {
  buscarMaterias,
  buscarSolicitudesDelTutor,
  guardarEnvio,
  listarSolicitudesDelTutor,
} from "./tutores.repository.js";
import { procesarArchivo } from "./verificacion/verificacion.service.js";

const verificarMaterias = async (materiaIds) => {
  const materias = await buscarMaterias(materiaIds);
  const faltantes = materiaIds.filter(
    (id) => !materias.some((materia) => materia.id === id),
  );
  if (faltantes.length > 0) {
    throw errorNegocio(
      "MATERIA_INEXISTENTE",
      "Una o más materias seleccionadas no existen",
      400,
    );
  }
  return materias;
};

const rechazarDuplicadas = async (tutorId, materiaIds, materias) => {
  const existentes = await buscarSolicitudesDelTutor(tutorId, materiaIds);
  const bloqueadas = existentes.filter(
    (solicitud) => solicitud.estado === "pendiente" || solicitud.estado === "aprobado",
  );

  if (bloqueadas.length > 0) {
    const nombres = bloqueadas.map(
      (solicitud) =>
        materias.find((materia) => materia.id === solicitud.materiaId)?.nombre ??
        `materia ${solicitud.materiaId}`,
    );
    throw errorNegocio(
      "SOLICITUD_DUPLICADA",
      `Ya tienes una solicitud pendiente o aprobada en: ${nombres.join(", ")}`,
      409,
    );
  }

  return new Map(existentes.map((solicitud) => [solicitud.materiaId, solicitud.id]));
};

export const registrarSolicitud = async (tutorId, datos, archivo) => {
  const materiaIds = datos.materias.map((materia) => materia.materiaId);

  const materias = await verificarMaterias(materiaIds);
  const previas = await rechazarDuplicadas(tutorId, materiaIds, materias);

  const materiasConPrevia = datos.materias.map((materia) => ({
    ...materia,
    solicitudPreviaId: previas.get(materia.materiaId) ?? null,
  }));

  const resultado = await guardarEnvio(
    tutorId,
    { ...datos, materias: materiasConPrevia },
    archivo,
  );

  void procesarArchivo(resultado.archivoId);

  return resultado;
};

export const listarSolicitudes = async (tutorId) => {
  const solicitudes = await listarSolicitudesDelTutor(tutorId);
  return solicitudes.map((solicitud) => ({
    id: solicitud.id,
    estado: solicitud.estado,
    descripcion: solicitud.descripcion,
    materia: solicitud.materias,
    creadoEn: solicitud.creadoEn,
  }));
};
