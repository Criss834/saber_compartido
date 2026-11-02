import { diaCorto, diaLargo, horaCorta, horaLarga, numeroDia, rangoSemana } from "./formato.js";

// Calendario de lunes a sábado con bloques de una hora, según la vista
// "Mi disponibilidad" del prototipo. Dos modos:
// - "edicion": cada bloque es un botón (disponible ↔ no disponible); el confirmado
//   no cambia y el pasado está deshabilitado.
// - "lectura": calendario público, solo muestra los bloques disponibles.

const ETIQUETA_ESTADO = {
  disponible: "Disponible",
  confirmado: "Tutoría confirmada",
  no_disponible: "No disponible",
  pasado: "Ya pasó",
};

const CLASE_ESTADO = {
  disponible: "bg-status-success text-status-success-ink",
  confirmado: "bg-[#f0eaff] text-[#7041bd]",
  no_disponible: "bg-[#f5f4f7] text-[#b1aaba]",
  pasado: "cursor-not-allowed bg-[#faf9fb] text-[#d6d2dc] line-through",
};

const LEYENDA_EDICION = [
  ["#b9edc9", "Disponible"],
  ["#d8c6ff", "Con tutoría confirmada"],
  ["#e9e6ed", "No disponible"],
];

const claseBotonNavegacion =
  "grid h-[33px] w-[33px] place-items-center rounded-[9px] border border-border bg-white text-[15px] font-bold text-text transition enabled:hover:border-[#d6c6f6] enabled:hover:bg-[#fbf9ff] disabled:cursor-not-allowed disabled:opacity-40";

export const NavegacionSemanas = ({ semana, semanas, onCambiar, deshabilitada = false }) => {
  const indice = semanas.indexOf(semana);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={claseBotonNavegacion}
        onClick={() => onCambiar(semanas[indice - 1])}
        disabled={deshabilitada || indice <= 0}
        aria-label="Semana anterior"
      >
        ‹
      </button>
      <strong className="min-w-[118px] text-center text-[11px] text-text" aria-live="polite">
        {rangoSemana(semana)}
      </strong>
      <button
        type="button"
        className={claseBotonNavegacion}
        onClick={() => onCambiar(semanas[indice + 1])}
        disabled={deshabilitada || indice === -1 || indice >= semanas.length - 1}
        aria-label="Semana siguiente"
      >
        ›
      </button>
    </div>
  );
};

const Bloque = ({ fecha, bloque, onPulsar }) => {
  const descripcion = `${diaLargo(fecha)}, ${horaLarga(bloque.horaInicio)} · ${ETIQUETA_ESTADO[bloque.estado]}`;
  return (
    <button
      type="button"
      title={descripcion}
      aria-label={descripcion}
      aria-pressed={bloque.estado === "disponible"}
      disabled={bloque.estado === "pasado"}
      onClick={() => onPulsar(fecha, bloque)}
      className={`my-[5px] block w-full rounded-[6px] border-0 px-[2px] py-[7px] text-[9px] font-bold transition enabled:hover:brightness-[0.97] max-[650px]:text-[8px] ${CLASE_ESTADO[bloque.estado]}`}
    >
      {horaCorta(bloque.horaInicio)}
    </button>
  );
};

export const CalendarioSemanal = ({ dias, modo = "edicion", onPulsarBloque }) => {
  const edicion = modo === "edicion";
  return (
    <>
      <div className="grid grid-cols-6 gap-[7px] max-[900px]:gap-1 max-[650px]:grid-cols-3">
        {dias.map(({ fecha, bloques }) => {
          const visibles = edicion
            ? bloques
            : bloques.filter((bloque) => bloque.estado === "disponible");
          return (
            <div
              key={fecha}
              className="min-w-0 rounded-[10px] border border-[#eee8f5] px-[5px] py-[9px] text-center"
            >
              <strong className="mb-[9px] block text-[10px] text-text">
                {diaCorto(fecha)} <span className="font-normal text-text-muted">{numeroDia(fecha)}</span>
              </strong>
              {edicion &&
                visibles.map((bloque) => (
                  <Bloque
                    key={bloque.horaInicio}
                    fecha={fecha}
                    bloque={bloque}
                    onPulsar={onPulsarBloque}
                  />
                ))}
              {!edicion &&
                visibles.map((bloque) => (
                  <span
                    key={bloque.horaInicio}
                    title={`${diaLargo(fecha)}, ${horaLarga(bloque.horaInicio)} – ${horaLarga(bloque.horaFin)}`}
                    className={`my-[5px] block rounded-[6px] px-[2px] py-[7px] text-[9px] font-bold max-[650px]:text-[8px] ${CLASE_ESTADO.disponible}`}
                  >
                    {horaCorta(bloque.horaInicio)}
                  </span>
                ))}
              {!edicion && visibles.length === 0 && (
                <span className="mt-[5px] block py-[7px] text-[9px] text-[#b1aaba]">—</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-[14px] flex flex-wrap gap-3 text-[9px] text-[#8e869d]">
        {(edicion ? LEYENDA_EDICION : LEYENDA_EDICION.slice(0, 1)).map(([color, texto]) => (
          <span key={texto} className="flex items-center gap-[5px]">
            <i className="inline-block h-[7px] w-[7px] rounded-[2px]" style={{ background: color }} />
            {texto}
          </span>
        ))}
        <span>Hora de Colombia</span>
      </div>
    </>
  );
};
