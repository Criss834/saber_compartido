import { Router } from "express";
import {
  crear,
  inscribir,
  inscritos,
  materias,
  mias,
  misInscripciones,
  publicas,
} from "./tutorias-grupales.controller.js";
import { esquemaCrearSesion, esquemaIdSesion } from "./tutorias-grupales.schema.js";
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
router.get("/:id/inscritos", soloTutor, validar(esquemaIdSesion, "params"), inscritos);

// "Tutorías grupales": vista de estudiante (y del tutor). El administrador
// recibe 403, como en /api/busqueda.
const comoEstudiante = requerirRol("estudiante", "tutor");
router.get("/", comoEstudiante, publicas);

// Inscripción (012): el tutor también puede inscribirse a sesiones de otros.
router.get("/inscripciones", comoEstudiante, misInscripciones);
router.post("/:id/inscripcion", comoEstudiante, validar(esquemaIdSesion, "params"), inscribir);

export default router;
