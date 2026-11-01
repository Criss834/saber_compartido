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
import { iniciarBarridoPendientes } from "./modules/tutores/verificacion/verificacion.service.js";
import { errorHandler } from "./shared/middlewares/errorHandler.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/materias", materiasRoutes);
app.use("/api/tutores", tutoresRoutes);
app.use("/api/admin", adminVerificacionRoutes);
app.use("/api/busqueda", busquedaRoutes);

transporte.verify()
  .then(() => console.log("SMTP conectado correctamente"))
  .catch((error) => console.error("Error de configuración SMTP:", error.message));

app.get("/api/salud", (req, res) => {
  res.json({ estado: "ok" });
});

app.use(errorHandler);

app.listen(config.puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${config.puerto}`);
  iniciarBarridoPendientes();
});

export default app;
