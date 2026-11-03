import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import { config } from "./config/index.js";
import {transporte} from "./shared/email/transporte.js";
import authRoutes from "./modules/auth/auth.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import materiasRoutes from "./modules/materias/materias.routes.js";
import tutoresRoutes from "./modules/tutores/tutores.routes.js";
import adminVerificacionRoutes from "./modules/tutores/verificacion/verificacion.routes.js";
import busquedaRoutes from "./modules/busqueda/busqueda.routes.js";
import disponibilidadRoutes from "./modules/disponibilidad/disponibilidad.routes.js";
import solicitudesRoutes from "./modules/solicitudes/solicitudes.routes.js";
import tutoriasGrupalesRoutes from "./modules/tutorias-grupales/tutorias-grupales.routes.js";
import { iniciarBarridoPendientes } from "./modules/tutores/verificacion/verificacion.service.js";
import { errorHandler } from "./shared/middlewares/errorHandler.js";

const app = express();

// En Railway la app está detrás de un proxy HTTPS.
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/materias", materiasRoutes);
app.use("/api/tutores", tutoresRoutes);
app.use("/api/admin", adminVerificacionRoutes);
app.use("/api/busqueda", busquedaRoutes);
app.use("/api/disponibilidad", disponibilidadRoutes);
app.use("/api/solicitudes", solicitudesRoutes);
app.use("/api/sesiones-grupales", tutoriasGrupalesRoutes);

transporte.verify()
  .then(() => console.log("SMTP conectado correctamente"))
  .catch((error) => console.error("Error de configuración SMTP:", error.message));

app.get("/api/salud", (req, res) => {
  res.json({ estado: "ok" });
});

// En producción el backend sirve el build del frontend (mismo dominio: la cookie
// de sesión y /api funcionan sin CORS). En desarrollo el frontend lo sirve Vite.
const carpetaFrontend = fileURLToPath(new URL("../../frontend/dist", import.meta.url));
if (process.env.NODE_ENV === "production" && existsSync(carpetaFrontend)) {
  app.use(express.static(carpetaFrontend));
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile("index.html", { root: carpetaFrontend });
  });
}

app.use(errorHandler);

app.listen(config.puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${config.puerto}`);
  iniciarBarridoPendientes();
});

export default app;
