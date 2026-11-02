// Las fechas llegan del backend como "YYYY-MM-DD" y las horas como "HH:MM", ya en
// hora de Colombia (America/Bogota). Para formatearlas sin que la zona del
// navegador las mueva, se interpretan a mediodía UTC y se formatean en UTC.

export const HORAS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

export const DIAS_POR_SEMANA = 6;

const aFecha = (fecha) => new Date(`${fecha}T12:00:00Z`);

export const sumarDias = (fecha, dias) =>
  new Date(aFecha(fecha).getTime() + dias * 86_400_000).toISOString().slice(0, 10);

const formatoDiaCorto = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  weekday: "short",
});
const formatoDiaLargo = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const formatoDiaMes = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

const limpiar = (texto) => texto.replace(/\./g, "").replace(",", "");
const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// "Lun"
export const diaCorto = (fecha) => mayuscula(limpiar(formatoDiaCorto.format(aFecha(fecha))));

// "martes 4 de noviembre"
export const diaLargo = (fecha) => limpiar(formatoDiaLargo.format(aFecha(fecha)));

// "4"
export const numeroDia = (fecha) => String(Number(fecha.slice(8, 10)));

const diaMes = (fecha) => limpiar(formatoDiaMes.format(aFecha(fecha))).replace(" de ", " ");

// "3 – 8 nov 2026" o "30 nov – 5 dic 2026"
export const rangoSemana = (lunes) => {
  const sabado = sumarDias(lunes, DIAS_POR_SEMANA - 1);
  const anio = sabado.slice(0, 4);
  const mismoMes = lunes.slice(5, 7) === sabado.slice(5, 7);
  const inicio = mismoMes ? numeroDia(lunes) : diaMes(lunes);
  return `${inicio} – ${diaMes(sabado)} ${anio}`;
};

// "8:00", "1:00" (como en el prototipo)
export const horaCorta = (hora) => {
  const horas = Number(hora.slice(0, 2));
  return `${horas % 12 === 0 ? 12 : horas % 12}:${hora.slice(3, 5)}`;
};

// "8:00 a. m.", "12:00 m.", "1:00 p. m."
export const horaLarga = (hora) => {
  const horas = Number(hora.slice(0, 2));
  const sufijo = horas < 12 ? "a. m." : horas === 12 ? "m." : "p. m.";
  return `${horaCorta(hora)} ${sufijo}`;
};

export const claveBloque = (fecha, horaInicio) => `${fecha}T${horaInicio}`;

const formatoMes = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", month: "short" });

// "NOV" (recuadro de fecha del prototipo)
export const mesCorto = (fecha) => limpiar(formatoMes.format(aFecha(fecha))).toUpperCase();
