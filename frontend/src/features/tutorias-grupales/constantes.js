import { horaLarga } from "../disponibilidad/formato.js";

// Reglas del formulario "Nueva sesión grupal" (las mismas del backend).
export const DURACIONES = [
  { minutos: 60, etiqueta: "60 minutos" },
  { minutos: 90, etiqueta: "90 minutos" },
  { minutos: 120, etiqueta: "120 minutos" },
];
export const DURACION_POR_DEFECTO = 90;

// Medio de la reunión (coincide con el ENUM de la BD). El texto de apoyo se
// muestra en la tarjeta que ve el estudiante.
export const MODALIDADES = [
  { clave: "meet", etiqueta: "Google Meet", icono: "▶", detalle: "Reunión en línea. El tutor compartirá el enlace." },
  { clave: "teams", etiqueta: "Microsoft Teams", icono: "▶", detalle: "Reunión en línea. El tutor compartirá el enlace." },
  { clave: "presencial", etiqueta: "Presencial", icono: "⌖", detalle: "En la universidad. El tutor indicará el lugar." },
];

export const modalidadDe = (clave) =>
  MODALIDADES.find((modalidad) => modalidad.clave === clave) ?? MODALIDADES[2];

export const CUPO_MINIMO = 2;
export const CUPO_MAXIMO = 30;
export const CUPO_POR_DEFECTO = 8;

export const TITULO_MINIMO = 5;
export const TITULO_MAXIMO = 150;
export const DESCRIPCION_MAXIMA = 1000;

export const DIAS_VENTANA = 28;
export const MINUTOS_FIN_MAXIMO = 21 * 60;

// "07:00", "07:30", …, "20:00", con su etiqueta "7:00 a. m."
export const HORAS_INICIO = Array.from({ length: 27 }, (_, indice) => {
  const minutos = 7 * 60 + indice * 30;
  const valor = `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${minutos % 60 === 0 ? "00" : "30"}`;
  return { valor, etiqueta: horaLarga(valor), minutos };
});

export const ESTADOS_SESION = {
  abierta: { etiqueta: "Abierta", clase: "bg-status-success text-status-success-ink" },
  llena: { etiqueta: "Llena", clase: "bg-status-pending text-status-pending-ink" },
  cancelada: { etiqueta: "Cancelada", clase: "bg-status-danger text-status-danger-ink" },
  completada: { etiqueta: "Completada", clase: "bg-status-neutral text-status-neutral-ink" },
};

const formatoHoy = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "YYYY-MM-DD" de hoy en Colombia.
export const hoyEnColombia = () => formatoHoy.format(new Date());
