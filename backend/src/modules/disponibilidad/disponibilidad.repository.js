import { prisma } from "../../shared/prisma/client.js";
import { ESTADO_CONFIRMADA } from "./disponibilidad.constantes.js";
import { fechaABd, fechaDeBd, horaABd, horaDeBd } from "./fechas.js";

// Las funciones reciben opcionalmente el cliente de una transacción, para que el
// service lea y escriba la semana dentro de la misma transacción.

const entreFechas = (desde, hasta) => ({
  gte: fechaABd(desde),
  lte: fechaABd(hasta),
});

const aBloque = (fila) => ({
  id: fila.id,
  fecha: fechaDeBd(fila.fecha),
  horaInicio: horaDeBd(fila.horaInicio),
  horaFin: horaDeBd(fila.horaFin),
});

// Todos los bloques del tutor entre dos fechas (activos e inactivos), con cuántas
// solicitudes tienen y si alguna es una tutoría confirmada.
export const bloquesDeTutorEntre = async (
  { tutorId, desde, hasta },
  cliente = prisma,
) => {
  const filas = await cliente.disponibilidad_tutores.findMany({
    where: { tutorId, fecha: entreFechas(desde, hasta) },
    select: {
      id: true,
      fecha: true,
      horaInicio: true,
      horaFin: true,
      activo: true,
      solicitudes_tutoria: { select: { estado: true } },
    },
    orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
  });

  return filas.map((fila) => ({
    ...aBloque(fila),
    activo: fila.activo,
    cantidadSolicitudes: fila.solicitudes_tutoria.length,
    confirmado: fila.solicitudes_tutoria.some(
      (solicitud) => solicitud.estado === ESTADO_CONFIRMADA,
    ),
  }));
};

// Bloques activos y sin tutoría confirmada, para el calendario público. El filtro
// de bloques pasados se hace en el service con la hora de Colombia.
export const bloquesLibresDeTutor = async ({ tutorId, desde, hasta }) => {
  const filas = await prisma.disponibilidad_tutores.findMany({
    where: {
      tutorId,
      activo: true,
      fecha: entreFechas(desde, hasta),
      solicitudes_tutoria: { none: { estado: ESTADO_CONFIRMADA } },
    },
    select: { id: true, fecha: true, horaInicio: true, horaFin: true },
    orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
  });
  return filas.map(aBloque);
};

// Aplica los cambios de una semana. Se llama dentro de una transacción.
export const aplicarCambiosDeSemana = async (
  { tutorId, crear, reactivarIds, borrarIds, desactivarIds },
  cliente,
) => {
  if (crear.length > 0) {
    await cliente.disponibilidad_tutores.createMany({
      data: crear.map(({ fecha, horaInicio, horaFin }) => ({
        tutorId,
        fecha: fechaABd(fecha),
        horaInicio: horaABd(horaInicio),
        horaFin: horaABd(horaFin),
      })),
    });
  }
  if (reactivarIds.length > 0) {
    await cliente.disponibilidad_tutores.updateMany({
      where: { id: { in: reactivarIds }, tutorId },
      data: { activo: true },
    });
  }
  // Los bloques con solicitudes no se pueden borrar (fk_st_disponibilidad sin
  // ON DELETE): se desactivan.
  if (desactivarIds.length > 0) {
    await cliente.disponibilidad_tutores.updateMany({
      where: { id: { in: desactivarIds }, tutorId },
      data: { activo: false },
    });
  }
  if (borrarIds.length > 0) {
    await cliente.disponibilidad_tutores.deleteMany({
      where: { id: { in: borrarIds }, tutorId },
    });
  }
};
