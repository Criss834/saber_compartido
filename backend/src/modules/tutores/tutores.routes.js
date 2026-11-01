import { Router } from "express";
import { listarSolicitudes, registrarSolicitud } from "./tutores.controller.js";
import { requerirSesion } from "../../shared/middlewares/requerir-sesion.js";
import { requerirRol } from "../../shared/auth/requerir-rol.js";
import { cargarCertificado } from "../../shared/cargar-certificado.js";
import { validar } from "../../shared/middlewares/validar.js";
import { esquemaSolicitudTutor } from "./tutores.schema.js";

const router = Router();

// "Ser tutor" es del estudiante (y del tutor que suma materias); el
// administrador no puede postularse. El rol se valida antes de leer el archivo.
const soloEstudianteOTutor = requerirRol("estudiante", "tutor");

router.get(
  "/solicitudes",
  requerirSesion,
  soloEstudianteOTutor,
  listarSolicitudes,
);
router.post(
  "/solicitudes",
  requerirSesion,
  soloEstudianteOTutor,
  cargarCertificado,
  validar(esquemaSolicitudTutor),
  registrarSolicitud,
);

export default router;
