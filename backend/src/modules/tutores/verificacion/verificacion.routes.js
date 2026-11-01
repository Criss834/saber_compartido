import { Router } from "express";
import {
  certificado,
  detalle,
  listar,
  reprocesar,
  resolver,
} from "./verificacion.controller.js";
import { requerirSesion } from "../../../shared/middlewares/requerir-sesion.js";
import { requerirRol } from "../../../shared/auth/requerir-rol.js";
import { validar } from "../../../shared/middlewares/validar.js";
import { esquemaResolverVerificacion } from "./verificacion.schema.js";

const router = Router();

router.use(requerirSesion, requerirRol("administrador"));

router.get("/verificaciones", listar);
router.get("/verificaciones/:id", detalle);
router.get("/verificaciones/:id/certificado", certificado);
router.post(
  "/verificaciones/:id/resolver",
  validar(esquemaResolverVerificacion),
  resolver,
);
router.post("/verificaciones/:id/reprocesar", reprocesar);

export default router;
