import { DURACION_BLOQUE_MIN, SEMANAS_VENTANA, ZONA_HORARIA } from "./disponibilidad.constantes.js";

// Las fechas viajan como texto "YYYY-MM-DD" y las horas como "HH:MM", siempre en
// hora de Colombia. La aritmética de días se hace en UTC para que la zona del
// servidor (Railway en UTC, local en Colombia) no las mueva.

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const formatoColombia = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Fecha y hora actuales en Colombia: { fecha: "YYYY-MM-DD", hora: "HH:MM" }.
export const ahoraEnColombia = (ahora = new Date()) => {
  const partes = Object.fromEntries(
    formatoColombia.formatToParts(ahora).map(({ type, value }) => [type, value]),
  );
  return {
    fecha: `${partes.year}-${partes.month}-${partes.day}`,
    hora: `${partes.hour}:${partes.minute}`,
  };
};

const aUtc = (fecha) => Date.parse(`${fecha}T00:00:00Z`);
const deUtc = (ms) => new Date(ms).toISOString().slice(0, 10);

export const esFechaValida = (fecha) =>
  /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
  !Number.isNaN(aUtc(fecha)) &&
  deUtc(aUtc(fecha)) === fecha;

export const sumarDias = (fecha, dias) => deUtc(aUtc(fecha) + dias * MS_POR_DIA);

// 0 = lunes … 6 = domingo.
export const diaDeLaSemana = (fecha) => (new Date(aUtc(fecha)).getUTCDay() + 6) % 7;

export const lunesDe = (fecha) => sumarDias(fecha, -diaDeLaSemana(fecha));

// Lunes de la semana actual y de las siguientes dentro de la ventana.
export const semanasDeLaVentana = (ahora = ahoraEnColombia()) => {
  const lunesActual = lunesDe(ahora.fecha);
  return Array.from({ length: SEMANAS_VENTANA }, (_, indice) =>
    sumarDias(lunesActual, indice * 7),
  );
};

// Un bloque que empieza ahora o antes ya pasó.
export const esPasado = (fecha, hora, ahora = ahoraEnColombia()) =>
  `${fecha}T${hora}` <= `${ahora.fecha}T${ahora.hora}`;

export const horaFinDe = (horaInicio) => {
  const [horas, minutos] = horaInicio.split(":").map(Number);
  const total = horas * 60 + minutos + DURACION_BLOQUE_MIN;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

// Prisma (adaptador MariaDB) devuelve DATE a medianoche UTC y TIME como
// 1970-01-01THH:MM:SSZ: se leen y escriben con UTC.
export const fechaDeBd = (valor) => valor.toISOString().slice(0, 10);
export const horaDeBd = (valor) => valor.toISOString().slice(11, 16);
export const fechaABd = (fecha) => new Date(`${fecha}T00:00:00Z`);
export const horaABd = (hora) => new Date(`1970-01-01T${hora}:00Z`);
