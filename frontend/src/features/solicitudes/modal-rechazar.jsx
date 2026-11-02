import { useState } from "react";
import { MAX_MOTIVO } from "./constantes.js";
import { claseBotonPrimario, claseBotonSecundario, claseCampo } from "./estilos.js";
import { textoHorario } from "./formato.js";
import { Modal, Ruedita } from "./modal.jsx";

// Confirmación de rechazo del prototipo ("Rechazar solicitud" con motivo
// opcional). `onConfirmar(motivo)` devuelve una promesa; el modal muestra el
// estado de envío y el error si falla.
export const ModalRechazar = ({ solicitud, onCerrar, onConfirmar }) => {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const confirmar = async (evento) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const resultado = await onConfirmar(motivo.trim() || undefined);
    if (resultado?.error) {
      setEnviando(false);
      setError(resultado.error);
    }
  };

  return (
    <Modal
      titulo="Rechazar solicitud"
      subtitulo={`¿Quieres rechazar la solicitud de ${solicitud.estudiante.nombreCompleto}?`}
      onCerrar={onCerrar}
      ocupado={enviando}
    >
      <form onSubmit={confirmar} noValidate>
        <div className="mb-4 rounded-[12px] border border-[#eeeaf5] bg-page px-4 py-3 text-[11px]">
          <strong className="block text-text">{solicitud.materia.nombre}</strong>
          <span className="text-text-muted">{textoHorario(solicitud)}</span>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="rechazo-motivo" className="text-[11px] font-semibold text-text">
            Motivo (opcional)
          </label>
          <textarea
            id="rechazo-motivo"
            rows={3}
            maxLength={MAX_MOTIVO}
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            placeholder="Indica el motivo para notificar al estudiante…"
            className={`${claseCampo} resize-y`}
          />
          <p className="m-0 text-right text-[10px] text-text-muted">
            {motivo.length}/{MAX_MOTIVO}
          </p>
        </div>

        <p className="mb-0 mt-2 text-[10px] leading-[1.6] text-text-muted">
          El horario volverá a quedar libre en tu calendario y el estudiante recibirá un correo.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-3 rounded-[12px] border border-[#ffd6da] bg-status-danger px-4 py-3 text-[11px] font-semibold text-status-danger-ink"
          >
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCerrar} disabled={enviando} className={claseBotonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className={`${claseBotonPrimario} bg-danger`}>
            {enviando && <Ruedita />}
            {enviando ? "Rechazando…" : "Confirmar rechazo"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
