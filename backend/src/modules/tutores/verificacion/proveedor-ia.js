import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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

// Reintentos con el MISMO modelo: solo para fallos pasajeros (red, 5xx, 429 por
// minuto). Una respuesta vacía, sin JSON o fuera del esquema no se reintenta con el
// mismo modelo (con el mismo PDF tiende a repetirse): se pasa al siguiente.
const MAX_INTENTOS_PASAJEROS = 2;
const ESPERA_POR_INTENTO_MS = [0, 5000];
const STATUS_REINTENTABLES = new Set([429, 500, 502, 503, 504]);

// Límites por lectura de un certificado, para no gastar una petición en cada
// modelo de la lista: si 2 modelos devuelven contenido inválido, el problema
// probablemente es el documento y lo revisa el administrador; y nunca se hacen
// más de 5 peticiones en total.
const MAX_MODELOS_CON_CONTENIDO_INVALIDO = 2;
const MAX_PETICIONES_POR_LECTURA = 5;

const errorDeContenido = (mensaje, causa) =>
  Object.assign(new ErrorProveedorIA(mensaje, causa), { deContenido: true });

// En el plan gratuito de Gemini la cuota es por modelo. Un 429 con espera larga
// (cuota diaria agotada) no se reintenta: se pausa ESE modelo hasta la hora que
// indique Gemini y se pasa al siguiente de config.ia.modelos.
const ESPERA_MAXIMA_REINTENTO_MS = 60 * 1000;
const PAUSA_POR_DEFECTO_MS = 60 * 60 * 1000;

// Las pausas se guardan fuera del repo para que sobrevivan a los reinicios del
// backend (npm run dev --watch). Si el archivo falla, quedan solo en memoria.
export const ARCHIVO_PAUSAS = path.join(
  os.tmpdir(),
  "saber-compartido-ia-pausas.json",
);

const cargarPausas = () => {
  try {
    const guardadas = JSON.parse(fs.readFileSync(ARCHIVO_PAUSAS, "utf8"));
    return new Map(
      Object.entries(guardadas).filter(
        ([, hasta]) => Number.isFinite(hasta) && hasta > Date.now(),
      ),
    );
  } catch {
    return new Map();
  }
};

const pausas = cargarPausas();

const guardarPausas = () => {
  try {
    fs.writeFileSync(ARCHIVO_PAUSAS, JSON.stringify(Object.fromEntries(pausas)));
  } catch {
    // Sin archivo: las pausas siguen vigentes en memoria hasta el próximo reinicio.
  }
};

const pausarModelo = (modelo, esperaMs) => {
  pausas.set(modelo, Date.now() + (esperaMs ?? PAUSA_POR_DEFECTO_MS));
  guardarPausas();
};

const pausaDe = (modelo) => {
  const hasta = pausas.get(modelo) ?? 0;
  return hasta > Date.now() ? hasta : null;
};

// null si algún modelo está disponible; si todos están en pausa, la hora más
// temprana en que alguno vuelve a estarlo.
export const iaPausadaHasta = () => {
  const { modelos } = config.ia;
  if (modelos.length === 0) return null;
  const hasta = modelos.map(pausaDe);
  if (hasta.some((valor) => valor === null)) return null;
  return new Date(Math.min(...hasta));
};

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
    throw errorDeContenido("Respuesta de la IA sin JSON");
  }
  try {
    return JSON.parse(texto.slice(inicio, fin + 1));
  } catch (error) {
    throw errorDeContenido("Respuesta de la IA con JSON inválido", error);
  }
};

// Lee el certificado con UN modelo. Reintenta solo fallos pasajeros (hasta 2
// intentos). Si la cuota del modelo está agotada, lo pausa; si el contenido es
// inválido, lanza un error `deContenido`. En ambos casos se prueba el siguiente.
// `presupuesto.restantes` se descuenta en cada petición, sumando todos los modelos.
const leerConModelo = async (modelo, cuerpo, presupuesto) => {
  const { apiKey, timeoutMs } = config.ia;
  let ultimoError = null;

  for (let intento = 0; intento < MAX_INTENTOS_PASAJEROS; intento++) {
    if (presupuesto.restantes <= 0) break;
    if (ESPERA_POR_INTENTO_MS[intento] > 0) {
      await new Promise((resolver) =>
        setTimeout(resolver, ESPERA_POR_INTENTO_MS[intento]),
      );
    }

    presupuesto.restantes -= 1;
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
          pausarModelo(modelo, espera);
          throw new ErrorProveedorIA(
            `Cuota de ${modelo} agotada (429); en pausa hasta ${new Date(pausaDe(modelo)).toISOString()}`,
          );
        }
      }
      ultimoError = new ErrorProveedorIA(
        `La API de IA respondió ${respuesta.status} (${modelo})`,
      );
      if (STATUS_REINTENTABLES.has(respuesta.status)) continue;
      throw ultimoError;
    }

    // A partir de aquí la petición respondió 200: cualquier fallo es de contenido
    // y no se reintenta con este modelo.
    const cuerpoRespuesta = await respuesta.json().catch(() => null);
    const texto = cuerpoRespuesta?.candidates?.[0]?.content?.parts
      ?.map((parte) => parte.text ?? "")
      .join("");
    if (!texto) {
      const motivo =
        cuerpoRespuesta?.promptFeedback?.blockReason ??
        cuerpoRespuesta?.candidates?.[0]?.finishReason;
      throw errorDeContenido(
        `Respuesta de la IA vacía${motivo ? ` (${motivo})` : ""}`,
      );
    }

    const validado = esquemaExtraccionCertificado.safeParse(extraerJson(texto));
    if (!validado.success) {
      throw errorDeContenido("La respuesta de la IA no cumple el esquema esperado");
    }

    return validado.data;
  }

  throw ultimoError ?? new ErrorProveedorIA("No se pudo leer el certificado");
};

const errorTodosEnPausa = (hasta) =>
  new ErrorProveedorIA(
    `Cuota de IA agotada en todos los modelos; disponible desde ${hasta.toISOString()}`,
  );

export const extraerDatosCertificado = async ({ bytes, mime }) => {
  const { apiKey, modelos } = config.ia;

  if (!apiKey) {
    throw new ErrorProveedorIA("GEMINI_API_KEY no configurada");
  }
  if (modelos.length === 0) {
    throw new ErrorProveedorIA("GEMINI_MODELOS no configurado");
  }
  const pausaInicial = iaPausadaHasta();
  if (pausaInicial) throw errorTodosEnPausa(pausaInicial);

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

  // Se prueba cada modelo disponible en orden; el primero que lea gana, dentro de
  // los límites de contenido inválido y de peticiones por lectura.
  const presupuesto = { restantes: MAX_PETICIONES_POR_LECTURA };
  let modelosConContenidoInvalido = 0;
  let ultimoError = null;

  for (const modelo of modelos) {
    if (pausaDe(modelo)) continue;
    if (presupuesto.restantes <= 0) {
      console.error(
        `IA: límite de ${MAX_PETICIONES_POR_LECTURA} peticiones por certificado alcanzado`,
      );
      break;
    }
    try {
      const datos = await leerConModelo(modelo, cuerpo, presupuesto);
      console.log(`IA: certificado leído con ${modelo}`);
      return datos;
    } catch (error) {
      ultimoError = error;
      console.error(`IA: ${modelo} falló: ${error.message}`);
      if (error.deContenido) {
        modelosConContenidoInvalido += 1;
        if (modelosConContenidoInvalido >= MAX_MODELOS_CON_CONTENIDO_INVALIDO) {
          throw new ErrorProveedorIA(
            `${modelosConContenidoInvalido} modelos devolvieron una respuesta inválida para este certificado; se deja para revisión manual`,
            error,
          );
        }
      }
    }
  }

  const pausaFinal = iaPausadaHasta();
  if (pausaFinal) throw errorTodosEnPausa(pausaFinal);
  throw ultimoError ?? new ErrorProveedorIA("No se pudo leer el certificado");
};

export default extraerDatosCertificado;
