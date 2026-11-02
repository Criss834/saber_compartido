import { z } from "zod";
import {
  CLAVES_METODO_PAGO,
  ESTADOS_FILTRABLES,
  MAX_MENSAJE,
  MAX_MOTIVO,
} from "./solicitudes.constantes.js";

// Un texto vacío (o solo espacios) cuenta como ausente.
const vacioComoAusente = (valor) =>
  typeof valor === "string" && valor.trim() === "" ? undefined : valor;

const enteroPositivo = (mensaje) =>
  z.coerce.number({ error: mensaje }).int(mensaje).positive(mensaje);

const textoOpcional = (maximo, nombre) =>
  z.preprocess(
    vacioComoAusente,
    z
      .string({ error: `${nombre} debe ser un texto` })
      .trim()
      .max(maximo, `${nombre} no puede superar los ${maximo} caracteres`)
      .optional(),
  );

export const esquemaCrearSolicitud = z.object({
  disponibilidadId: enteroPositivo("Selecciona un horario válido"),
  materiaId: enteroPositivo("Selecciona una materia válida"),
  metodoPago: z.enum(CLAVES_METODO_PAGO, {
    error: "Selecciona un método de pago válido",
  }),
  mensaje: textoOpcional(MAX_MENSAJE, "El mensaje"),
});

export const esquemaRechazarSolicitud = z.object({
  motivo: textoOpcional(MAX_MOTIVO, "El motivo"),
});

export const esquemaFiltroEstado = z.object({
  estado: z.preprocess(
    vacioComoAusente,
    z
      .enum(ESTADOS_FILTRABLES, {
        error: "El estado debe ser pendiente, aceptada o rechazada",
      })
      .optional(),
  ),
});

export const esquemaIdSolicitud = z.object({
  id: enteroPositivo("El identificador debe ser un entero positivo"),
});

export default esquemaCrearSolicitud;
