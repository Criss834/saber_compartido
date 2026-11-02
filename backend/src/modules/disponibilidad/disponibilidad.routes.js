import { Router } from "express";
import {
  disponibilidadDeTutor,
  guardarSemana,
  miSemana,
} from "./disponibilidad.controller.js";
import {
  esquemaConsultarSemana,
  esquemaGuardarSemana,
  esquemaIdTutor,
} from "./disponibilidad.schema.js";
import { requerirSesion } from "../../shared/middlewares/requerir-sesion.js";
import { requerirRol } from "../../shared/auth/requerir-rol.js";
import { validar } from "../../shared/middlewares/validar.js";

const router = Router();

router.use(requerirSesion);

// Disponibilidad propia: solo el tutor verificado.
const soloTutor = requerirRol("tutor");
router.get("/mia", soloTutor, validar(esquemaConsultarSemana, "query"), miSemana);
router.put("/mia", soloTutor, validar(esquemaGuardarSemana), guardarSemana);

// Calendario público: vista de estudiante (y del tutor); el administrador recibe
// 403, igual que en /api/busqueda.
router.get(
  "/tutores/:id",
  requerirRol("estudiante", "tutor"),
  validar(esquemaIdTutor, "params"),
  disponibilidadDeTutor,
);

export default router;
