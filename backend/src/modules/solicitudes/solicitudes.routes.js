import { Router } from "express";
import {
  aceptar,
  crear,
  enviadas,
  pendientesRecibidas,
  recibidas,
  rechazar,
} from "./solicitudes.controller.js";
import {
  esquemaCrearSolicitud,
  esquemaFiltroEstado,
  esquemaIdSolicitud,
  esquemaRechazarSolicitud,
} from "./solicitudes.schema.js";
import { requerirSesion } from "../../shared/middlewares/requerir-sesion.js";
import { requerirRol } from "../../shared/auth/requerir-rol.js";
import { validar } from "../../shared/middlewares/validar.js";

const router = Router();

router.use(requerirSesion);

// Pedir y seguir tutorías: vista de estudiante (el tutor también puede pedir a
// otros tutores). El administrador recibe 403, como en /api/busqueda.
const comoEstudiante = requerirRol("estudiante", "tutor");
router.post("/", comoEstudiante, validar(esquemaCrearSolicitud), crear);
router.get("/enviadas", comoEstudiante, validar(esquemaFiltroEstado, "query"), enviadas);

// Responder: solo el tutor, y solo sus solicitudes (lo comprueba el service).
const soloTutor = requerirRol("tutor");
router.get("/recibidas", soloTutor, validar(esquemaFiltroEstado, "query"), recibidas);
router.get("/recibidas/pendientes", soloTutor, pendientesRecibidas);
router.post(
  "/:id/aceptar",
  soloTutor,
  validar(esquemaIdSolicitud, "params"),
  aceptar,
);
router.post(
  "/:id/rechazar",
  soloTutor,
  validar(esquemaIdSolicitud, "params"),
  validar(esquemaRechazarSolicitud),
  rechazar,
);

export default router;
