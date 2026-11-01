import "dotenv/config";

const CLAVE_SESION = process.env.JWT_SECRET ?? "";

if (CLAVE_SESION.length < 32) {
  throw new Error(
    "JWT_SECRET es obligatorio y debe tener al menos 32 caracteres. " +
      'Genera uno con: node -p "crypto.randomBytes(48).toString(16)"',
  );
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? "";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  throw new Error(
    "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI son obligatorias. " +
      "Cópialas desde .env.template a .env con las credenciales de Google Cloud.",
  );
}

export const config = {
  puerto: Number(process.env.PORT ?? 3000),
  urlBaseDatos: process.env.DATABASE_URL,
  urlFrontend: process.env.URL_FRONTEND ?? "http://localhost:5173",
  smtp: {
    host: process.env.SMTP_HOST,
    puerto: Number(process.env.SMTP_PORT ?? 587),
    usuario: process.env.SMTP_USER,
    clave: process.env.SMTP_PASS,
    remitente: process.env.CORREO_REMITENTE,
  },
  sesion: {
    secreto: CLAVE_SESION,
    duracionSegundos: 7 * 24 * 60 * 60,
    nombreCookie: "sesion",
    secure: process.env.NODE_ENV === "production",
  },
  google: {
    idCliente: GOOGLE_CLIENT_ID,
    secretoCliente: GOOGLE_CLIENT_SECRET,
    uriRedireccion: GOOGLE_REDIRECT_URI,
  },
  ia: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    modelo: process.env.GEMINI_MODELO ?? "",
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS ?? 60000),
  },
};

export default config;
