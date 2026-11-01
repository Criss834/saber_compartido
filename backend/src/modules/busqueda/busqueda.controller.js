import { buscar, listarMaterias, obtenerPerfil } from "./busqueda.service.js";

export const buscarTutores = async (req, res, next) => {
  try {
    const resultado = await buscar(req.usuarioId, req.validado.query);
    return res.status(200).json(resultado);
  } catch (error) {
    return next(error);
  }
};

export const materias = async (req, res, next) => {
  try {
    const lista = await listarMaterias(req.usuarioId);
    return res.status(200).json(lista);
  } catch (error) {
    return next(error);
  }
};

export const perfilTutor = async (req, res, next) => {
  try {
    const perfil = await obtenerPerfil(req.usuarioId, req.validado.params.id);
    return res.status(200).json(perfil);
  } catch (error) {
    return next(error);
  }
};
