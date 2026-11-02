import {
  aceptarSolicitud,
  contarPendientesRecibidas,
  crearSolicitud,
  listarEnviadas,
  listarRecibidas,
  rechazarSolicitud,
} from "./solicitudes.service.js";

// El estudiante y el tutor son siempre el usuario de la sesión (`req.usuarioId`);
// el tutor de una solicitud nueva sale del bloque, nunca del cuerpo.

const responder = (status, accion) => async (req, res, next) => {
  try {
    return res.status(status).json(await accion(req));
  } catch (error) {
    return next(error);
  }
};

export const crear = responder(201, (req) => crearSolicitud(req.usuarioId, req.body));

export const enviadas = responder(200, (req) =>
  listarEnviadas(req.usuarioId, req.validado.query.estado),
);

export const recibidas = responder(200, (req) =>
  listarRecibidas(req.usuarioId, req.validado.query.estado),
);

export const pendientesRecibidas = responder(200, (req) =>
  contarPendientesRecibidas(req.usuarioId),
);

export const aceptar = responder(200, (req) =>
  aceptarSolicitud(req.usuarioId, req.validado.params.id),
);

export const rechazar = responder(200, (req) =>
  rechazarSolicitud(req.usuarioId, req.validado.params.id, req.body.motivo),
);
