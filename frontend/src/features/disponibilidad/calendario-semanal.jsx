import { diaCorto, diaLargo, horaCorta, horaLarga, numeroDia, rangoSemana } from "./formato.js";

// Calendario de lunes a sábado con bloques de una hora, según la vista
// "Mi disponibilidad" del prototipo. Dos modos:
// - "edicion": cada bloque es un botón (disponible ↔ no disponible); el confirmado
//   el que tiene una solicitud pendiente y el que coincide con una sesión grupal (011)
//   no cambian, y el pasado está deshabilitado.
// - "lectura": calendario público, solo muestra los bloques disponibles. Si se
//   pasa `onPulsarBloque`, cada bloque libre se puede seleccionar (010).

const ETIQUETA_ESTADO = {
  disponible: "Disponible",
  confirmado: "Con tutoría confirmada",
  pendiente: "Con solicitud pendiente",
  sesion_grupal: "Sesión grupal",
  no_disponible: "No disponible",
  pasado: "Ya pasó",
};

const CLASE_ESTADO = {
  disponible: "bg-status-success text-status-success-ink",
  confirmado: "bg-[#f0eaff] text-[#7041bd]",
  pendiente: "bg-status-pending text-status-pending-ink",
  sesion_grupal: "bg-status-info text-status-info-ink",
  no_disponible: "bg-[#f5f4f7] text-[#b1aaba]",
  pasado: "cursor-not-allowed bg-[#faf9fb] text-[#d6d2dc] line-through",
};

const LEYENDA_EDICION = [
  ["#b9edc9", "Disponible"],
  ["#d8c6ff", "Con tutoría confirmada"],
  ["#ffe3a3", "Con solicitud pendiente"],
  ["#bfdbfe", "Sesión grupal"],
  ["#e9e6ed", "No disponible"],
];

const claseBotonNavegacion =
  "grid h-[33px] w-[33px] place-items-center rounded-[9px] border border-border bg-white text-[15px] font-bold text-text transition enabled:hover:border-[#d6c6f6] enabled:hover:bg-[#fbf9ff] disabled:cursor-not-allowed disabled:opacity-40";

const claseBloque =
  "my-[5px] block w-full rounded-[6px] border-0 px-[2px] py-[7px] text-[9px] font-bold transition max-[650px]:text-[8px]";

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

const BloqueEditable = ({ fecha, bloque, onPulsar }) => {
  const descripcion = `${diaLargo(fecha)}, ${horaLarga(bloque.horaInicio)} · ${ETIQUETA_ESTADO[bloque.estado]}`;
  return (
    <button
      type="button"
      title={descripcion}
      aria-label={descripcion}
      aria-pressed={bloque.estado === "disponible"}
      disabled={bloque.estado === "pasado"}
      onClick={() => onPulsar(fecha, bloque)}
      className={`${claseBloque} enabled:hover:brightness-[0.97] ${CLASE_ESTADO[bloque.estado]}`}
    >
      {horaCorta(bloque.horaInicio)}
    </button>
  );
};

const BloquePublico = ({ fecha, bloque, onPulsar, seleccionado }) => {
  const descripcion = `${diaLargo(fecha)}, ${horaLarga(bloque.horaInicio)} – ${horaLarga(bloque.horaFin)}`;
  if (!onPulsar) {
    return (
      <span title={descripcion} className={`${claseBloque} ${CLASE_ESTADO.disponible}`}>
        {horaCorta(bloque.horaInicio)}
      </span>
    );
  }
  return (
    <button
      type="button"
      title={`Solicitar: ${descripcion}`}
      aria-label={`Solicitar tutoría el ${descripcion}`}
      aria-pressed={seleccionado}
      onClick={() => onPulsar(fecha, bloque)}
      className={`${claseBloque} hover:-translate-y-px hover:shadow-[0_3px_9px_rgba(22,132,71,0.18)] ${
        seleccionado
          ? "bg-status-success-ink text-white"
          : CLASE_ESTADO.disponible
      }`}
    >
      {horaCorta(bloque.horaInicio)}
    </button>
  );
};

export const CalendarioSemanal = ({
  dias,
  modo = "edicion",
  onPulsarBloque,
  seleccionado = null,
}) => {
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
              {visibles.map((bloque) =>
                edicion ? (
                  <BloqueEditable
                    key={bloque.horaInicio}
                    fecha={fecha}
                    bloque={bloque}
                    onPulsar={onPulsarBloque}
                  />
                ) : (
                  <BloquePublico
                    key={bloque.horaInicio}
                    fecha={fecha}
                    bloque={bloque}
                    onPulsar={onPulsarBloque}
                    seleccionado={seleccionado === bloque.id}
                  />
                ),
              )}
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
