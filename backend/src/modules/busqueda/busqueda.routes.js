import { Router } from "express";
import { buscarTutores, materias, perfilTutor } from "./busqueda.controller.js";
import { esquemaBusquedaTutores, esquemaIdTutor } from "./busqueda.schema.js";
import { requerirSesion } from "../../shared/middlewares/requerir-sesion.js";
import { requerirRol } from "../../shared/auth/requerir-rol.js";
import { validar } from "../../shared/middlewares/validar.js";

const router = Router();

// La búsqueda es una vista de estudiante (y del tutor, que conserva esa vista);
// el administrador recibe 403, igual que en /api/tutores/solicitudes.
router.use(requerirSesion, requerirRol("estudiante", "tutor"));

router.get("/tutores", validar(esquemaBusquedaTutores, "query"), buscarTutores);
router.get("/materias", materias);
router.get("/tutores/:id", validar(esquemaIdTutor, "params"), perfilTutor);

export default router;
