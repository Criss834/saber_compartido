import { z } from "zod";
import { esFechaValida } from "../disponibilidad/fechas.js";
import {
  CUPO_MAXIMO,
  CUPO_MINIMO,
  DESCRIPCION_MAXIMA,
  DURACIONES_MINUTOS,
  HORAS_INICIO,
  MODALIDADES,
  TITULO_MAXIMO,
  TITULO_MINIMO,
} from "./tutorias-grupales.constantes.js";

// Un texto vacío (o solo espacios) cuenta como ausente.
const vacioComoAusente = (valor) =>
  typeof valor === "string" && valor.trim() === "" ? undefined : valor;

const enteroEntre = (minimo, maximo, mensaje) =>
  z.coerce.number({ error: mensaje }).int(mensaje).min(minimo, mensaje).max(maximo, mensaje);

// Las reglas que dependen de la fecha actual (futuro, ventana de 4 semanas) y
// del fin máximo se validan en el service.
export const esquemaCrearSesion = z.object({
  titulo: z
    .string({ error: "Escribe el nombre de la sesión" })
    .trim()
    .min(TITULO_MINIMO, `El nombre debe tener al menos ${TITULO_MINIMO} caracteres`)
    .max(TITULO_MAXIMO, `El nombre no puede superar los ${TITULO_MAXIMO} caracteres`),
  materiaId: enteroEntre(1, Number.MAX_SAFE_INTEGER, "Selecciona una materia válida"),
  fecha: z
    .string({ error: "Elige la fecha de la sesión" })
    .refine(esFechaValida, "La fecha debe tener formato AAAA-MM-DD"),
  horaInicio: z.enum(HORAS_INICIO, {
    error: "La hora de inicio debe ser en punto o y media, de 7:00 a. m. a 8:00 p. m.",
  }),
  duracionMinutos: z.coerce
    .number({ error: "Elige una duración válida" })
    .refine((valor) => DURACIONES_MINUTOS.includes(valor), "La duración debe ser de 60, 90 o 120 minutos"),
  modalidad: z.enum(Object.keys(MODALIDADES), {
    error: "Elige el medio de la reunión: Google Meet, Microsoft Teams o presencial",
  }),
  cupo: enteroEntre(CUPO_MINIMO, CUPO_MAXIMO, `El cupo debe ser un número entre ${CUPO_MINIMO} y ${CUPO_MAXIMO}`),
  descripcion: z.preprocess(
    vacioComoAusente,
    z
      .string({ error: "La descripción debe ser un texto" })
      .trim()
      .max(DESCRIPCION_MAXIMA, `La descripción no puede superar los ${DESCRIPCION_MAXIMA} caracteres`)
      .optional(),
  ),
});

export const esquemaIdSesion = z.object({
  id: enteroEntre(1, Number.MAX_SAFE_INTEGER, "El identificador debe ser un entero positivo"),
});

export default esquemaCrearSesion;
