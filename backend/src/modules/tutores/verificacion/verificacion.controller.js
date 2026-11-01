import { errorNegocio } from "../../../shared/errores/error-negocio.js";
import {
  listarVerificaciones,
  obtenerCertificado,
  obtenerVerificacion,
  reprocesarVerificacion,
  resolverVerificacion,
} from "./verificacion.service.js";

const idDeParams = (params) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorNegocio(
      "VERIFICACION_NO_ENCONTRADA",
      "La solicitud no existe",
      404,
    );
  }
  return id;
};

export const listar = async (req, res, next) => {
  try {
    const verificaciones = await listarVerificaciones();
    return res.status(200).json(verificaciones);
  } catch (error) {
    return next(error);
  }
};

export const detalle = async (req, res, next) => {
  try {
    const id = idDeParams(req.params);
    const verificacion = await obtenerVerificacion(id);
    return res.status(200).json(verificacion);
  } catch (error) {
    return next(error);
  }
};

export const certificado = async (req, res, next) => {
  try {
    const id = idDeParams(req.params);
    const archivo = await obtenerCertificado(id);
    res.setHeader("Content-Type", archivo.tipoMime);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(archivo.contenido);
  } catch (error) {
    return next(error);
  }
};

export const resolver = async (req, res, next) => {
  try {
    const id = idDeParams(req.params);
    const { decision } = req.body;
    const resultado = await resolverVerificacion(
      id,
      decision,
      req.usuarioId,
    );
    return res.status(200).json({
      mensaje: `Solicitud ${decision}`,
      ...resultado,
    });
  } catch (error) {
    return next(error);
  }
};

export const reprocesar = async (req, res, next) => {
  try {
    const id = idDeParams(req.params);
    const resultado = await reprocesarVerificacion(id);
    return res.status(202).json({
      mensaje: "Certificado en cola de reprocesamiento",
      ...resultado,
    });
  } catch (error) {
    return next(error);
  }
};
