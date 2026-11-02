import { useState } from "react";
import { useAuth } from "../auth/auth-context.jsx";
import { diaLargo, horaLarga } from "../disponibilidad/formato.js";
import { crearSolicitud } from "./api-solicitudes.js";
import { AVISO_PAGO, MAX_MENSAJE, METODOS_PAGO } from "./constantes.js";
import { claseBotonPrimario, claseBotonSecundario, claseCampo } from "./estilos.js";
import { Modal, Ruedita } from "./modal.jsx";

// Modal "Solicitar una tutoría" del prototipo (`requestTutor`), con el horario
// elegido en el calendario real del tutor y el método de pago en lugar de la
// modalidad.
export const ModalSolicitar = ({ tutor, bloque, onCerrar, onEnviada, onHorarioNoDisponible }) => {
  const { fijarUsuario } = useAuth();
  const [materiaId, setMateriaId] = useState(
    tutor.materias.length === 1 ? String(tutor.materias[0].id) : "",
  );
  const [metodoPago, setMetodoPago] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const horario = `${diaLargo(bloque.fecha)}, de ${horaLarga(bloque.horaInicio)} a ${horaLarga(bloque.horaFin)}`;

  const enviar = async (evento) => {
    evento.preventDefault();
    const siguientes = {};
    if (!materiaId) siguientes.materia = "Elige la materia de la tutoría.";
    if (!metodoPago) siguientes.metodoPago = "Elige tu método de pago preferido.";
    setErrores(siguientes);
    if (Object.keys(siguientes).length > 0) return;

    setEnviando(true);
    setErrorEnvio(null);
    try {
      const solicitud = await crearSolicitud({
        disponibilidadId: bloque.id,
        materiaId: Number(materiaId),
        metodoPago,
        mensaje: mensaje.trim() || undefined,
      });
      onEnviada(solicitud);
    } catch (fallo) {
      setEnviando(false);
      if (fallo?.status === 401) {
        fijarUsuario(null);
        return;
      }
      if (fallo?.codigo === "HORARIO_NO_DISPONIBLE") {
        onHorarioNoDisponible(fallo.message);
        return;
      }
      const detalle = fallo?.detalle ? Object.values(fallo.detalle).flat()[0] : null;
      setErrorEnvio(detalle ?? fallo.message);
    }
  };

  return (
    <Modal
      titulo="Solicitar una tutoría"
      subtitulo={`Vas a enviar una solicitud a ${tutor.nombreCompleto}.`}
      onCerrar={onCerrar}
      ocupado={enviando}
    >
      <form onSubmit={enviar} noValidate>
        <div className="mb-4 rounded-[12px] border border-[#e9defc] bg-primary-light px-4 py-3">
          <span className="block text-[10px] font-bold uppercase tracking-[0.6px] text-primary">
            Horario elegido
          </span>
          <strong className="mt-1 block text-[12px] text-text">{horario}</strong>
          <span className="text-[10px] text-text-muted">Hora de Colombia</span>
        </div>

        <div className="grid gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="solicitud-materia" className="text-[11px] font-semibold text-text">
              Materia *
            </label>
            <select
              id="solicitud-materia"
              value={materiaId}
              onChange={(evento) => setMateriaId(evento.target.value)}
              aria-invalid={Boolean(errores.materia)}
              aria-describedby={errores.materia ? "solicitud-materia-error" : undefined}
              className={`${claseCampo} ${errores.materia ? "border-danger" : ""}`}
            >
              {tutor.materias.length > 1 && <option value="">Selecciona una materia</option>}
              {tutor.materias.map((materia) => (
                <option key={materia.id} value={materia.id}>
                  {materia.nombre}
                </option>
              ))}
            </select>
            {errores.materia && (
              <p id="solicitud-materia-error" role="alert" className="m-0 text-[11px] text-danger">
                {errores.materia}
              </p>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="solicitud-pago" className="text-[11px] font-semibold text-text">
              Método de pago preferido *
            </label>
            <select
              id="solicitud-pago"
              value={metodoPago}
              onChange={(evento) => setMetodoPago(evento.target.value)}
              aria-invalid={Boolean(errores.metodoPago)}
              aria-describedby="solicitud-pago-ayuda"
              className={`${claseCampo} ${errores.metodoPago ? "border-danger" : ""}`}
            >
              <option value="">Selecciona</option>
              {METODOS_PAGO.map((metodo) => (
                <option key={metodo.clave} value={metodo.clave}>
                  {metodo.etiqueta}
                </option>
              ))}
            </select>
            {errores.metodoPago && (
              <p role="alert" className="m-0 text-[11px] text-danger">
                {errores.metodoPago}
              </p>
            )}
            <p id="solicitud-pago-ayuda" className="m-0 text-[10px] leading-[1.6] text-text-muted">
              {AVISO_PAGO}
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="solicitud-mensaje" className="text-[11px] font-semibold text-text">
              ¿Qué te gustaría reforzar? (opcional)
            </label>
            <textarea
              id="solicitud-mensaje"
              rows={3}
              maxLength={MAX_MENSAJE}
              value={mensaje}
              onChange={(evento) => setMensaje(evento.target.value)}
              placeholder="Cuéntale al tutor qué tema necesitas trabajar…"
              className={`${claseCampo} resize-y`}
            />
            <p className="m-0 text-right text-[10px] text-text-muted">
              {mensaje.length}/{MAX_MENSAJE}
            </p>
          </div>
        </div>

        <p className="mb-0 mt-3 text-[10px] leading-[1.6] text-text-muted">
          La solicitud quedará pendiente hasta que el tutor responda. Te avisaremos por correo.
        </p>

        {errorEnvio && (
          <div
            role="alert"
            className="mt-3 rounded-[12px] border border-[#ffd6da] bg-status-danger px-4 py-3 text-[11px] font-semibold text-status-danger-ink"
          >
            {errorEnvio}
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCerrar} disabled={enviando} className={claseBotonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className={`${claseBotonPrimario} bg-accent`}>
            {enviando && <Ruedita />}
            {enviando ? "Enviando…" : "Enviar solicitud"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
