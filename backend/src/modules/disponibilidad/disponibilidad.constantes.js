// Bloques de una hora, de lunes a sábado, en hora de Colombia. Las horas son las
// del prototipo "Mi disponibilidad" más la 1:00 p. m. (8:00 a. m. a 6:00 p. m.).
export const HORAS_PERMITIDAS = [
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

export const DURACION_BLOQUE_MIN = 60;

// Lunes (0) a sábado (5), contados desde el lunes de la semana.
export const DIAS_POR_SEMANA = 6;

export const MAX_BLOQUES_POR_SEMANA = HORAS_PERMITIDAS.length * DIAS_POR_SEMANA;

// La semana actual y las 3 siguientes.
export const SEMANAS_VENTANA = 4;

export const ZONA_HORARIA = "America/Bogota";

// Una solicitud en este estado es una tutoría confirmada: su bloque no se toca.
export const ESTADO_CONFIRMADA = "aceptada";

// Una solicitud pendiente retiene el bloque (010): no aparece como libre y el
// tutor no lo puede quitar hasta responderla.
export const ESTADO_PENDIENTE = "pendiente";
