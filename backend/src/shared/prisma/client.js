import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../../generated/prisma/client.ts";
import { config } from "../../config/index.js";

// Bases gestionadas como Aiven exigen TLS con su propio certificado de CA.
// Si DATABASE_SSL_CA trae el PEM, la URL se pasa como objeto para añadir `ssl`;
// sin ella (Docker local) se usa la URL tal cual.
function opcionesConexion(url, ca) {
  if (!ca) return url;
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.slice(1)),
    ssl: { ca: ca.replace(/\\n/g, "\n"), rejectUnauthorized: true },
  };
}

const adapter = new PrismaMariaDb(
  opcionesConexion(config.urlBaseDatos, process.env.DATABASE_SSL_CA),
);

export const prisma = globalThis.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
