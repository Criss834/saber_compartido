import {
  crearSesion,
  listarMateriasParaSesion,
  listarMisSesiones,
  listarPublicas,
} from "./tutorias-grupales.service.js";

// El tutor es siempre el usuario de la sesión (`req.usuarioId`), nunca un dato
// del cuerpo.

const responder = (status, accion) => async (req, res, next) => {
  try {
    return res.status(status).json(await accion(req));
  } catch (error) {
    return next(error);
  }
};

export const crear = responder(201, (req) => crearSesion(req.usuarioId, req.body));
export const mias = responder(200, (req) => listarMisSesiones(req.usuarioId));
export const materias = responder(200, (req) => listarMateriasParaSesion(req.usuarioId));
export const publicas = responder(200, (req) => listarPublicas(req.usuarioId));
