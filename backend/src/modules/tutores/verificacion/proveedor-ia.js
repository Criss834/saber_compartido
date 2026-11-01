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
    throw new ErrorProveedorIA(
      "No se pudo contactar con la API de IA",
      error,
    );
  }

  if (!respuesta.ok) {
    throw new ErrorProveedorIA(`La API de IA respondió ${respuesta.status}`);
  }

  let datos;
  try {
    const cuerpoRespuesta = await respuesta.json();
    const texto = cuerpoRespuesta?.candidates?.[0]?.content?.parts
      ?.map((parte) => parte.text ?? "")
      .join("");
    if (!texto) {
      throw new ErrorProveedorIA("Respuesta de la IA vacía");
    }
    datos = extraerJson(texto);
  } catch (error) {
    if (error instanceof ErrorProveedorIA) throw error;
    throw new ErrorProveedorIA("Respuesta de la IA inválida", error);
  }

  const validado = esquemaExtraccionCertificado.safeParse(datos);
  if (!validado.success) {
    throw new ErrorProveedorIA(
      "La respuesta de la IA no cumple el esquema esperado",
    );
  }

  return validado.data;
};

export default extraerDatosCertificado;
