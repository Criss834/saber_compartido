import {
  crearSesion,
  inscribirse,
  listarInscritos,
  listarMisInscripciones,
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

// Inscripción (012): el estudiante es el usuario de la sesión; la sesión, el id de la URL.
export const inscribir = responder(201, (req) => inscribirse(req.usuarioId, req.validado.params.id));
export const misInscripciones = responder(200, (req) => listarMisInscripciones(req.usuarioId));
export const inscritos = responder(200, (req) => listarInscritos(req.usuarioId, req.validado.params.id));
