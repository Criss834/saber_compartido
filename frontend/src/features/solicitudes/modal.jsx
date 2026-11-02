import { useEffect, useRef } from "react";

// Modal del prototipo (`.modal`): capa oscura, tarjeta de hasta 560px, encabezado
// con "SABER COMPARTIDO", título, subtítulo y botón ×. Cierra con Escape o al
// pulsar fuera (salvo mientras `ocupado`), bloquea el scroll de la página y
// pone el foco en el primer campo.
export const Modal = ({ titulo, subtitulo, onCerrar, ocupado = false, children, pie }) => {
  const tarjeta = useRef(null);

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const enfocable = tarjeta.current?.querySelector("select, input, textarea, button:not([data-cerrar])");
    enfocable?.focus();
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  useEffect(() => {
    const alPulsarTecla = (evento) => {
      if (evento.key === "Escape" && !ocupado) onCerrar();
    };
    document.addEventListener("keydown", alPulsarTecla);
    return () => document.removeEventListener("keydown", alPulsarTecla);
  }, [onCerrar, ocupado]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(33,16,57,0.45)] p-[15px]"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !ocupado) onCerrar();
      }}
    >
      <div
        ref={tarjeta}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className="max-h-[min(88vh,850px)] w-[min(560px,calc(100vw-30px))] overflow-auto rounded-[18px] bg-white p-[25px] shadow-[0_25px_80px_rgba(33,16,57,0.25)] max-[650px]:p-[19px]"
      >
        <div className="mb-5 flex items-start justify-between gap-[14px]">
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-primary">
              Saber Compartido
            </span>
            <h2 id="modal-titulo" className="mb-[7px] mt-[5px] text-[19px] tracking-[-0.5px] text-text">
              {titulo}
            </h2>
            {subtitulo && (
              <p className="m-0 text-[11px] leading-[1.6] text-text-muted">{subtitulo}</p>
            )}
          </div>
          <button
            type="button"
            data-cerrar
            onClick={onCerrar}
            disabled={ocupado}
            aria-label="Cerrar"
            className="grid h-[33px] w-[33px] flex-none place-items-center rounded-[9px] border border-border bg-white text-[17px] text-text-muted transition hover:text-text disabled:opacity-40"
          >
            ×
          </button>
        </div>
        {children}
        {pie && <div className="mt-5 flex flex-wrap justify-end gap-2">{pie}</div>}
      </div>
    </div>
  );
};

export const Ruedita = () => (
  <span className="motion-safe:animate-spin h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white" />
);
