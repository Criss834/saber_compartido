import { fechaDeBd, horaDeBd } from "../disponibilidad/fechas.js";

// Intervalos de un mismo día en minutos desde la medianoche (hora de Colombia),
// medio abiertos: [inicio, fin). Una sesión que termina a las 10:00 no choca
// con otra que empieza a las 10:00.

export const minutosDe = (hora) => {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
};

export const horaDe = (minutos) =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

export const seCruzan = (a, b) => a.inicio < b.fin && b.inicio < a.fin;

// Sesión grupal guardada → { fecha, horaInicio, horaFin, inicio, fin }.
export const intervaloDeSesion = ({ fechaHoraSesion, duracionMinutos }) => {
  const horaInicio = horaDeBd(fechaHoraSesion);
  const inicio = minutosDe(horaInicio);
  const fin = inicio + duracionMinutos;
  return { fecha: fechaDeBd(fechaHoraSesion), horaInicio, horaFin: horaDe(fin), inicio, fin };
};

// Bloque o tutoría (horaInicio/horaFin como TIME de Prisma) → intervalo.
export const intervaloDeHoras = ({ horaInicio, horaFin }) => {
  const inicio = minutosDe(horaDeBd(horaInicio));
  const fin = minutosDe(horaDeBd(horaFin));
  return { inicio, fin, horaInicio: horaDe(inicio), horaFin: horaDe(fin) };
};
