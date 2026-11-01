import { z } from "zod";

const textoONulo = z.string().trim().max(150).nullable();

export const esquemaExtraccionCertificado = z.object({
  nombre: textoONulo,
  primerApellido: textoONulo,
  segundoApellido: textoONulo,
  materias: z.array(
    z.object({
      nombre: z.string().trim().min(1).max(150),
      nota: z.number().nullable(),
      estado: z.string().trim().max(50).nullable(),
    }),
  ),
  firmaDetectada: z.boolean(),
  legible: z.boolean(),
});

export default esquemaExtraccionCertificado;
