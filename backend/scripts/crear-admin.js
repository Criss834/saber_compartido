// Crea (o actualiza) una cuenta con rol administrador.
// Uso (variables solo en la sesión, nunca en archivos versionados):
//   $env:ADMIN_CORREO="..."; $env:ADMIN_NOMBRES="..."; $env:ADMIN_APELLIDOS="..."; $env:ADMIN_CONTRASENA="..."
//   node --experimental-strip-types scripts/crear-admin.js
import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/shared/prisma/client.js";

const COSTO_BCRYPT = 10;

const variables = [
  "ADMIN_CORREO",
  "ADMIN_NOMBRES",
  "ADMIN_APELLIDOS",
  "ADMIN_CONTRASENA",
];

const faltantes = variables.filter((nombre) => !process.env[nombre]);
if (faltantes.length > 0) {
  console.error(
    `Faltan variables de entorno: ${faltantes.join(", ")}. ` +
      "Defínelas solo en la sesión de ejecución; no las guardes en archivos.",
  );
  process.exit(1);
}

const correo = process.env.ADMIN_CORREO.trim().toLowerCase();
if (!correo.endsWith("@amigo.edu.co")) {
  console.error("ADMIN_CORREO debe terminar en @amigo.edu.co");
  process.exit(1);
}

const contrasenaHash = await bcrypt.hash(
  process.env.ADMIN_CONTRASENA,
  COSTO_BCRYPT,
);

const usuario = await prisma.usuarios.upsert({
  where: { correoInstitucional: correo },
  update: {
    nombres: process.env.ADMIN_NOMBRES.trim(),
    apellidos: process.env.ADMIN_APELLIDOS.trim(),
    contrasenaHash,
    rol: "administrador",
    emailVerificado: true,
    tokenVerificacion: null,
    tokenExpira: null,
  },
  create: {
    nombres: process.env.ADMIN_NOMBRES.trim(),
    apellidos: process.env.ADMIN_APELLIDOS.trim(),
    correoInstitucional: correo,
    contrasenaHash,
    rol: "administrador",
    emailVerificado: true,
  },
  select: { id: true, correoInstitucional: true, rol: true },
});

console.log(
  `Administrador listo: id=${usuario.id} correo=${usuario.correoInstitucional} rol=${usuario.rol}`,
);

await prisma.$disconnect();
