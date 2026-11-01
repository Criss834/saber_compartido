import { config } from "../../../config/index.js";
import { esquemaExtraccionCertificado } from "./verificacion.schema.js";

const URL_MODELO =
  "https://generativelanguage.googleapis.com/v1beta/models";

const PROMPT = `Lee este certificado de notas universitario y extráe solo los datos académicos. NO extraigas ni menciones la cédula de identidad ni ningún número de documento.

Devuelve exactamente este JSON:
{
  "nombre": string | null,
  "primerApellido": string | null,
  "segundoApellido": string | null,
  "materias": [{ "nombre": string, "nota": number | null, "estado": string | null }],
  "firmaDetectada": boolean,
  "legible": boolean
}

Reglas:
- "nombre" es solo el nombre(s); los apellidos van en "primerApellido" y "segundoApellido".
- Cada elemento de "materias" es una fila del certificado: nombre de la materia, nota numérica (usa punto decimal) y estado (p. ej. APROBADO, REPROBADO).
- Si un dato no se ve o no es legible, usa null.
- "firmaDetectada" es true si el documento tiene un bloque de firma visible.
- "legible" es true si el documento se puede leer de forma razonable.`;

const ESQUEMA_GEMINI = {
  type: "object",
  properties: {
    nombre: { type: "string", nullable: true },
    primerApellido: { type: "string", nullable: true },
    segundoApellido: { type: "string", nullable: true },
    materias: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          nota: { type: "number", nullable: true },
          estado: { type: "string", nullable: true },
        },
        required: ["nombre", "nota", "estado"],
      },
    },
    firmaDetectada: { type: "boolean" },
    legible: { type: "boolean" },
  },
  required: [
    "nombre",
    "primerApellido",
    "segundoApellido",
    "materias",
    "firmaDetectada",
    "legible",
  ],
};

export class ErrorProveedorIA extends Error {
  constructor(mensaje, causa) {
    super(mensaje);
    this.name = "ErrorProveedorIA";
    this.causa = causa;
  }
}

const MAX_INTENTOS = 3;
const ESPERA_POR_INTENTO_MS = [0, 5000, 15000];
const STATUS_REINTENTABLES = new Set([429, 500, 502, 503, 504]);

// Un 429 con espera larga (p. ej. cuota diaria agotada) no se reintenta: se pausa
// el proveedor hasta la hora que indique Gemini para no gastar más peticiones.
const ESPERA_MAXIMA_REINTENTO_MS = 60 * 1000;
const PAUSA_POR_DEFECTO_MS = 60 * 60 * 1000;
let pausadoHasta = 0;

export const iaPausadaHasta = () =>
  Date.now() < pausadoHasta ? new Date(pausadoHasta) : null;

const esperaSolicitadaMs = (cuerpoError) => {
  const detalles = cuerpoError?.error?.details;
  if (!Array.isArray(detalles)) return null;
  const info = detalles.find((detalle) =>
    String(detalle?.["@type"] ?? "").endsWith("RetryInfo"),
  );
  const segundos = Number.parseFloat(String(info?.retryDelay ?? ""));
  return Number.isFinite(segundos) ? Math.ceil(segundos * 1000) : null;
};

const esErrorRed = (error) =>
  error instanceof Error &&
  (error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    error.name === "TypeError");

const extraerJson = (texto) => {
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio === -1 || fin === -1 || fin < inicio) {
    throw new ErrorProveedorIA("Respuesta de la IA sin JSON");
  }
  return JSON.parse(texto.slice(inicio, fin + 1));
};

export const extraerDatosCertificado = async ({ bytes, mime }) => {
  const { apiKey, modelo, timeoutMs } = config.ia;

  if (!apiKey) {
    throw new ErrorProveedorIA("GEMINI_API_KEY no configurada");
  }
  if (!modelo) {
    throw new ErrorProveedorIA("GEMINI_MODELO no configurado");
  }
  const pausa = iaPausadaHasta();
  if (pausa) {
    throw new ErrorProveedorIA(
      `Cuota de la IA agotada; en pausa hasta ${pausa.toISOString()}`,
    );
  }

  const cuerpo = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          {
            inline_data: {
              mime_type: mime,
              data: Buffer.from(bytes).toString("base64"),
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ESQUEMA_GEMINI,
    },
  };

  let ultimoError = null;

  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    if (ESPERA_POR_INTENTO_MS[intento] > 0) {
      await new Promise((resolver) =>
        setTimeout(resolver, ESPERA_POR_INTENTO_MS[intento]),
      );
    }

    let respuesta;
    try {
      respuesta = await fetch(
        `${URL_MODELO}/${encodeURIComponent(modelo)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(cuerpo),
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
    } catch (error) {
      ultimoError = new ErrorProveedorIA(
        "No se pudo contactar con la API de IA",
        error,
      );
      if (esErrorRed(error)) continue;
      throw ultimoError;
    }

    if (!respuesta.ok) {
      if (respuesta.status === 429) {
        const espera = esperaSolicitadaMs(
          await respuesta.json().catch(() => null),
        );
        if (espera === null || espera > ESPERA_MAXIMA_REINTENTO_MS) {
          pausadoHasta = Date.now() + (espera ?? PAUSA_POR_DEFECTO_MS);
          throw new ErrorProveedorIA(
            `Cuota de la IA agotada (429); en pausa hasta ${new Date(pausadoHasta).toISOString()}`,
          );
        }
      }
      ultimoError = new ErrorProveedorIA(
        `La API de IA respondió ${respuesta.status}`,
      );
      if (STATUS_REINTENTABLES.has(respuesta.status)) continue;
      throw ultimoError;
    }

    let datos;
    try {
      const cuerpoRespuesta = await respuesta.json();
      const texto = cuerpoRespuesta?.candidates?.[0]?.content?.parts
        ?.map((parte) => parte.text ?? "")
        .join("");
      if (!texto) {
        ultimoError = new ErrorProveedorIA("Respuesta de la IA vacía");
        continue;
      }
      datos = extraerJson(texto);
    } catch (error) {
      if (error instanceof ErrorProveedorIA) {
        ultimoError = error;
        continue;
      }
      ultimoError = new ErrorProveedorIA("Respuesta de la IA inválida", error);
      continue;
    }

    const validado = esquemaExtraccionCertificado.safeParse(datos);
    if (!validado.success) {
      ultimoError = new ErrorProveedorIA(
        "La respuesta de la IA no cumple el esquema esperado",
      );
      continue;
    }

    return validado.data;
  }

  throw ultimoError ?? new ErrorProveedorIA("No se pudo leer el certificado");
};

export default extraerDatosCertificado;
