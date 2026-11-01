import { z } from "zod";

export const FILTROS = ["todos", "calificacion", "promedio"];

// Los parámetros de la query llegan como texto: un valor vacío ("?q=") cuenta
// como ausente, para que la URL del frontend pueda llevar campos sin rellenar.
const vacioComoAusente = (valor) =>
  typeof valor === "string" && valor.trim() === "" ? undefined : valor;

const MENSAJE_ID = "El identificador debe ser un entero positivo";

const enteroPositivo = (mensaje) =>
  z.coerce
    .number({ error: mensaje })
    .int(mensaje)
    .positive(mensaje);

export const esquemaBusquedaTutores = z.object({
  q: z.preprocess(
    vacioComoAusente,
    z
      .string({ error: "La búsqueda debe ser un texto" })
      .trim()
      .max(80, "La búsqueda no puede superar los 80 caracteres")
      .optional(),
  ),
  materiaId: z.preprocess(
    vacioComoAusente,
    enteroPositivo("Selecciona una materia válida").optional(),
  ),
  filtro: z.preprocess(
    vacioComoAusente,
    z
      .enum(FILTROS, {
        error: "El filtro debe ser todos, calificacion o promedio",
      })
      .default("todos"),
  ),
});

export const esquemaIdTutor = z.object({
  id: enteroPositivo(MENSAJE_ID),
});

export default esquemaBusquedaTutores;
