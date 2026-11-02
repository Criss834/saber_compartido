// Reglas de las sesiones grupales (GRU-TUT-001), en hora de Colombia. Las
// duraciones son las del prototipo; las horas de inicio van cada 30 minutos.
export const DURACIONES_MINUTOS = [60, 90, 120];

export const CUPO_MINIMO = 2;
export const CUPO_MAXIMO = 30;

export const HORA_PRIMER_INICIO = "07:00";
export const HORA_ULTIMO_INICIO = "20:00";
export const HORA_FIN_MAXIMA = "21:00";

// "07:00", "07:30", …, "20:00"
export const HORAS_INICIO = (() => {
  const horas = [];
  const [hInicio] = HORA_PRIMER_INICIO.split(":").map(Number);
  const [hUltima] = HORA_ULTIMO_INICIO.split(":").map(Number);
  for (let h = hInicio; h <= hUltima; h++) {
    for (const m of [0, 30]) {
      if (h === hUltima && m > 0) break;
      horas.push(`${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`);
    }
  }
  return horas;
})();

export const TITULO_MINIMO = 5;
export const TITULO_MAXIMO = 150;
export const DESCRIPCION_MAXIMA = 1000;

// Una sesión en estos estados ocupa la agenda del tutor.
export const ESTADOS_VIVOS = ["abierta", "llena"];

// Inscripciones que cuentan para el cupo (tech-stack).
export const INSCRIPCION_CONFIRMADA = "confirmada";
