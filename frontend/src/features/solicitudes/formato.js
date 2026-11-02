import { diaLargo, horaLarga } from "../disponibilidad/formato.js";

// "lunes 9 de noviembre · 8:00 a. m. – 9:00 a. m." (hora de Colombia)
export const textoHorario = (solicitud) =>
  `${diaLargo(solicitud.fecha)} · ${horaLarga(solicitud.horaInicio)} – ${horaLarga(solicitud.horaFin)}`;
