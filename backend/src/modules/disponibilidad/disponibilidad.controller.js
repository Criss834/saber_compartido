import {
  guardarMiSemana,
  obtenerDisponibilidadPublica,
  obtenerMiSemana,
} from "./disponibilidad.service.js";

// El tutor de "mia" es siempre el usuario de la sesión, nunca un dato del cliente.

export const miSemana = async (req, res, next) => {
  try {
    const semana = await obtenerMiSemana(req.usuarioId, req.validado.query.semana);
    return res.status(200).json(semana);
  } catch (error) {
    return next(error);
  }
};

export const guardarSemana = async (req, res, next) => {
  try {
    const semana = await guardarMiSemana(req.usuarioId, req.body);
    return res.status(200).json(semana);
  } catch (error) {
    return next(error);
  }
};

export const disponibilidadDeTutor = async (req, res, next) => {
  try {
    const disponibilidad = await obtenerDisponibilidadPublica(
      req.usuarioId,
      req.validado.params.id,
    );
    return res.status(200).json(disponibilidad);
  } catch (error) {
    return next(error);
  }
};
