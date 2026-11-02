import { mesCorto, numeroDia } from "../disponibilidad/formato.js";
import { PESTANAS, badgeDe } from "./constantes.js";

// Piezas compartidas por "Mis tutorías" y "Solicitudes recibidas", según el
// prototipo (`.tabs`, `.session-item`, `.date-tile`).

export const Pestanas = ({ estado, onCambiar }) => (
  <div
    role="tablist"
    aria-label="Filtrar por estado"
    className="mb-[17px] flex w-max max-w-full items-center gap-[5px] overflow-auto rounded-[10px] bg-[#f5f2fa] p-[5px]"
  >
    {PESTANAS.map((pestana) => {
      const activa = (estado ?? null) === pestana.estado;
      return (
        <button
          key={pestana.etiqueta}
          type="button"
          role="tab"
          aria-selected={activa}
          onClick={() => onCambiar(pestana.estado)}
          className={`whitespace-nowrap rounded-[7px] border-0 px-3 py-2 text-[10px] font-bold transition ${
            activa
              ? "bg-white text-primary-dark shadow-[0_2px_5px_rgba(50,16,92,0.04)]"
              : "bg-transparent text-[#8b829d] hover:text-primary"
          }`}
        >
          {pestana.etiqueta}
        </button>
      );
    })}
  </div>
);

export const Badge = ({ solicitud }) => {
  const badge = badgeDe(solicitud);
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-[5px] text-[9px] font-bold ${badge.clase}`}>
      {badge.etiqueta}
    </span>
  );
};

export const RecuadroFecha = ({ fecha }) => (
  <div className="flex h-[58px] w-[52px] flex-none flex-col items-center justify-center rounded-[11px] bg-primary-light text-primary-dark max-[650px]:h-[51px] max-[650px]:w-[44px]">
    <small className="text-[9px] font-extrabold uppercase">{mesCorto(fecha)}</small>
    <strong className="text-[20px] leading-[1.25]">{numeroDia(fecha)}</strong>
  </div>
);

export const PanelLista = ({ titulo, pie, children }) => (
  <section className="min-w-0 overflow-hidden rounded-card border border-[#eeeaf5] bg-white shadow-card">
    <div className="border-b border-[#f1edf6] px-5 py-[18px]">
      <h2 className="m-0 text-[13px] tracking-[-0.25px]">{titulo}</h2>
    </div>
    <div className="px-5 py-[18px] max-[650px]:px-[15px]">{children}</div>
    {pie && (
      <div className="border-t border-[#f1edf6] px-5 py-3 text-[10px] text-text-muted">{pie}</div>
    )}
  </section>
);

export const EstadoCarga = ({ texto }) => (
  <div role="status" className="flex min-h-[25vh] flex-col items-center justify-center gap-4">
    <span className="motion-safe:animate-spin h-7 w-7 rounded-full border-[3px] border-border border-t-primary" />
    <p className="text-text-muted">{texto}</p>
  </div>
);

export const EstadoVacio = ({ icono, titulo, texto, children }) => (
  <div className="flex flex-col items-center px-[15px] py-[30px] text-center">
    <span
      className="mb-3 grid h-[46px] w-[46px] place-items-center rounded-[14px] bg-icon-lilac text-[20px] text-icon-lilac-ink"
      aria-hidden="true"
    >
      {icono}
    </span>
    <strong className="mb-[6px] block text-[12px] text-text">{titulo}</strong>
    <p className="mx-auto mb-[14px] mt-0 max-w-[300px] text-[10px] leading-[1.6] text-text-muted">{texto}</p>
    {children}
  </div>
);

export const Aviso = ({ tipo = "exito", children }) => (
  <div
    role={tipo === "error" ? "alert" : "status"}
    className={`mb-[17px] rounded-[12px] border px-4 py-3 text-[11px] font-semibold ${
      tipo === "error"
        ? "border-[#ffd6da] bg-status-danger text-status-danger-ink"
        : "border-[#cdeed8] bg-status-success text-status-success-ink"
    }`}
  >
    {children}
  </div>
);
