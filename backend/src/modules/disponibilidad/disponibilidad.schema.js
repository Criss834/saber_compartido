import { z } from "zod";
import { HORAS_PERMITIDAS, MAX_BLOQUES_POR_SEMANA } from "./disponibilidad.constantes.js";
import { esFechaValida } from "./fechas.js";

// Un valor vacío en la query ("?semana=") cuenta como ausente.
const vacioComoAusente = (valor) =>
  typeof valor === "string" && valor.trim() === "" ? undefined : valor;

const fecha = (mensaje) =>
  z.string({ error: mensaje }).refine(esFechaValida, mensaje);

const MENSAJE_SEMANA = "La semana debe ser una fecha con formato AAAA-MM-DD";
const MENSAJE_ID = "El identificador debe ser un entero positivo";

// Las reglas que dependen de la fecha actual (semana dentro de la ventana,
// bloques no pasados, fechas de esa semana) se validan en el service.
export const esquemaGuardarSemana = z.object({
  semana: fecha(MENSAJE_SEMANA),
  bloques: z
    .array(
      z.object({
        fecha: fecha("La fecha del bloque debe tener formato AAAA-MM-DD"),
        horaInicio: z.enum(HORAS_PERMITIDAS, {
          error: "La hora del bloque no está entre las permitidas",
        }),
      }),
      { error: "Los bloques deben ser una lista" },
    )
    .max(
      MAX_BLOQUES_POR_SEMANA,
      `Una semana no puede tener más de ${MAX_BLOQUES_POR_SEMANA} bloques`,
    ),
});

export const esquemaConsultarSemana = z.object({
  semana: z.preprocess(vacioComoAusente, fecha(MENSAJE_SEMANA).optional()),
});

export const esquemaIdTutor = z.object({
  id: z.coerce
    .number({ error: MENSAJE_ID })
    .int(MENSAJE_ID)
    .positive(MENSAJE_ID),
});

export default esquemaGuardarSemana;
