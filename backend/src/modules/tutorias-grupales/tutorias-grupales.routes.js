import { Router } from "express";
import { crear, materias, mias, publicas } from "./tutorias-grupales.controller.js";
import { esquemaCrearSesion } from "./tutorias-grupales.schema.js";
import { requerirSesion } from "../../shared/middlewares/requerir-sesion.js";
import { requerirRol } from "../../shared/auth/requerir-rol.js";
import { validar } from "../../shared/middlewares/validar.js";

const router = Router();

router.use(requerirSesion);

// Crear y ver las propias sesiones: solo el tutor verificado.
const soloTutor = requerirRol("tutor");
router.post("/", soloTutor, validar(esquemaCrearSesion), crear);
router.get("/mias", soloTutor, mias);
router.get("/materias", soloTutor, materias);

// "Tutorías grupales": vista de estudiante (y del tutor). El administrador
// recibe 403, como en /api/busqueda.
router.get("/", requerirRol("estudiante", "tutor"), publicas);

export default router;
