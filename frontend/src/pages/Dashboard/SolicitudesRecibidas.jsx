import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/auth-context.jsx";
import { Avatar } from "../../features/dashboard/avatar.jsx";
import { horaLarga, diaLargo } from "../../features/disponibilidad/formato.js";
import {
  aceptarSolicitud,
  avisarCambioSolicitudes,
  obtenerRecibidas,
  rechazarSolicitud,
} from "../../features/solicitudes/api-solicitudes.js";
import { claseBotonSecundario } from "../../features/solicitudes/estilos.js";
import {
  Aviso,
  Badge,
  EstadoCarga,
  EstadoVacio,
  PanelLista,
  Pestanas,
  RecuadroFecha,
} from "../../features/solicitudes/lista-solicitudes.jsx";
import { textoHorario } from "../../features/solicitudes/formato.js";
import { ModalRechazar } from "../../features/solicitudes/modal-rechazar.jsx";
import { useListaSolicitudes } from "../../features/solicitudes/use-lista-solicitudes.js";

const MENSAJE_ACEPTADA = "Solicitud aceptada. El estudiante recibirá una notificación.";
const MENSAJE_RECHAZADA =
  "Solicitud rechazada. El horario volvió a quedar libre y el estudiante recibirá una notificación.";

const formatoEnvio = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "short",
});
const enviadaEl = (creadoEn) => `Enviada el ${formatoEnvio.format(new Date(creadoEn)).replace(".", "")}`;

const claseBotonPequeno =
  "inline-flex min-h-[31px] items-center justify-center gap-1.5 rounded-[8px] border-0 px-3 text-[10px] font-bold transition enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

const Acciones = ({ solicitud, respondiendo, onAceptar, onRechazar }) => {
  if (solicitud.estado !== "pendiente") return <span className="text-text-muted">—</span>;
  const ocupada = respondiendo === solicitud.id;
  return (
    <div className="flex flex-wrap gap-1.5">
      {!solicitud.vencida && (
        <button
          type="button"
          onClick={() => onAceptar(solicitud)}
          disabled={Boolean(respondiendo)}
          className={`${claseBotonPequeno} bg-status-success text-status-success-ink`}
        >
          {ocupada && (
            <span className="motion-safe:animate-spin h-3 w-3 rounded-full border-2 border-status-success-ink/30 border-t-status-success-ink" />
          )}
          {ocupada ? "Aceptando…" : "Aceptar"}
        </button>
      )}
      <button
        type="button"
        onClick={() => onRechazar(solicitud)}
        disabled={Boolean(respondiendo)}
        className={`${claseBotonPequeno} bg-status-danger text-status-danger-ink`}
      >
        Rechazar
      </button>
    </div>
  );
};

const Estudiante = ({ solicitud }) => (
  <div className="flex min-w-[170px] items-center gap-[9px]">
    <Avatar nombre={solicitud.estudiante.nombreCompleto} size="size-[34px]" className="text-[10px]" />
    <div className="min-w-0">
      <strong className="block text-[10px] text-text">{solicitud.estudiante.nombreCompleto}</strong>
      <small className="mt-1 block break-all text-[9px] text-text-muted">
        {solicitud.estudiante.correo ?? "Estudiante verificado"}
      </small>
    </div>
  </div>
);

const Mensaje = ({ solicitud }) =>
  solicitud.mensaje ? (
    <p className="mb-0 mt-1 line-clamp-2 text-[9px] italic text-text-muted" title={solicitud.mensaje}>
      “{solicitud.mensaje}”
    </p>
  ) : null;

export const SolicitudesRecibidas = () => {
  const { fijarUsuario } = useAuth();
  const lista = useListaSolicitudes(obtenerRecibidas);
  const { estado, solicitudes, cargando, error } = lista;
  const [aviso, setAviso] = useState(null);
  const [respondiendo, setRespondiendo] = useState(null);
  const [aRechazar, setARechazar] = useState(null);

  // Tras responder (bien o con 409/404) se recarga la lista y el contador.
  const despuesDeResponder = (siguienteAviso) => {
    setAviso(siguienteAviso);
    lista.recargar();
    avisarCambioSolicitudes();
  };

  const manejarFallo = (fallo) => {
    if (fallo?.status === 401) {
      fijarUsuario(null);
      return null;
    }
    if (fallo?.status === 409 || fallo?.status === 404) {
      despuesDeResponder({ tipo: "error", texto: fallo.message });
      return null;
    }
    return fallo.message;
  };

  const aceptar = async (solicitud) => {
    setRespondiendo(solicitud.id);
    setAviso(null);
    try {
      await aceptarSolicitud(solicitud.id);
      despuesDeResponder({ tipo: "exito", texto: MENSAJE_ACEPTADA });
    } catch (fallo) {
      const mensaje = manejarFallo(fallo);
      if (mensaje) setAviso({ tipo: "error", texto: mensaje });
    } finally {
      setRespondiendo(null);
    }
  };

  const rechazar = async (motivo) => {
    try {
      await rechazarSolicitud(aRechazar.id, motivo);
      setARechazar(null);
      despuesDeResponder({ tipo: "exito", texto: MENSAJE_RECHAZADA });
      return null;
    } catch (fallo) {
      const mensaje = manejarFallo(fallo);
      if (mensaje) return { error: mensaje };
      setARechazar(null);
      return null;
    }
  };

  const abrirRechazo = (solicitud) => {
    setAviso(null);
    setARechazar(solicitud);
  };

  const pendientes = solicitudes?.filter((s) => s.estado === "pendiente" && !s.vencida).length ?? 0;

  return (
    <>
      <section className="mb-[21px] flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-primary">
            Mi espacio de tutor
          </span>
          <h1 className="mb-[7px] mt-[9px] font-heading text-[24px] tracking-[-0.8px] text-text max-[650px]:text-[22px]">
            Solicitudes recibidas
          </h1>
          <p className="m-0 max-w-[540px] text-[11px] leading-[1.7] text-text-muted">
            Revisa las solicitudes de estudiantes y confirma o rechaza los horarios.
          </p>
        </div>
        <Link to="/dashboard/mi-disponibilidad" className={claseBotonSecundario}>
          Ver disponibilidad
        </Link>
      </section>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <Pestanas estado={estado} onCambiar={lista.cambiarEstado} />

      <PanelLista
        titulo="Solicitudes de tutoría"
        pie={
          solicitudes && !error
            ? `${solicitudes.length} ${solicitudes.length === 1 ? "solicitud" : "solicitudes"}${
                pendientes > 0 ? ` · ${pendientes} por responder` : ""
              }`
            : null
        }
      >
        {!solicitudes && !error && <EstadoCarga texto="Cargando solicitudes…" />}

        {error && (
          <EstadoVacio
            icono="!"
            titulo="No pudimos cargar las solicitudes"
            texto="Ocurrió un problema al consultar tus solicitudes. Inténtalo de nuevo."
          >
            <button type="button" onClick={lista.recargar} className={claseBotonSecundario}>
              Reintentar
            </button>
          </EstadoVacio>
        )}

        {solicitudes && !error && solicitudes.length === 0 && (
          <EstadoVacio
            icono="↗"
            titulo="No hay solicitudes en esta categoría"
            texto="Las nuevas solicitudes de tutoría aparecerán aquí. Publica horarios en “Mi disponibilidad” para recibirlas."
          />
        )}

        {solicitudes && !error && solicitudes.length > 0 && (
          <div aria-busy={cargando} className={`transition-opacity ${cargando ? "opacity-60" : ""}`}>
            {/* Escritorio: tabla del prototipo */}
            <div className="-mx-5 overflow-x-auto max-[650px]:hidden">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr>
                    {["Estudiante", "Materia", "Horario solicitado", "Pago", "Estado", "Acciones"].map((columna) => (
                      <th
                        key={columna}
                        scope="col"
                        className="whitespace-nowrap bg-[#fcfbfe] px-[15px] py-3 text-left text-[9px] font-extrabold uppercase tracking-[0.65px] text-[#958ca7]"
                      >
                        {columna}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((solicitud) => (
                    <tr key={solicitud.id}>
                      <td className="border-t border-[#f0edf5] px-[15px] py-[14px] align-middle text-[10px]">
                        <Estudiante solicitud={solicitud} />
                      </td>
                      <td className="max-w-[200px] border-t border-[#f0edf5] px-[15px] py-[14px] align-middle text-[10px] text-text">
                        {solicitud.materia.nombre}
                        <Mensaje solicitud={solicitud} />
                      </td>
                      <td className="whitespace-nowrap border-t border-[#f0edf5] px-[15px] py-[14px] align-middle text-[10px] text-text">
                        {diaLargo(solicitud.fecha)}
                        <br />
                        <span className="text-text-muted">
                          {horaLarga(solicitud.horaInicio)} – {horaLarga(solicitud.horaFin)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-t border-[#f0edf5] px-[15px] py-[14px] align-middle text-[10px] text-text">
                        {solicitud.metodoPago.etiqueta}
                      </td>
                      <td className="border-t border-[#f0edf5] px-[15px] py-[14px] align-middle text-[10px]">
                        <Badge solicitud={solicitud} />
                        <small className="mt-1.5 block whitespace-nowrap text-[9px] text-text-muted">
                          {enviadaEl(solicitud.creadoEn)}
                        </small>
                      </td>
                      <td className="border-t border-[#f0edf5] px-[15px] py-[14px] align-middle text-[10px]">
                        <Acciones
                          solicitud={solicitud}
                          respondiendo={respondiendo}
                          onAceptar={aceptar}
                          onRechazar={abrirRechazo}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Móvil: tarjetas */}
            <ul className="m-0 hidden list-none p-0 max-[650px]:block">
              {solicitudes.map((solicitud) => (
                <li
                  key={solicitud.id}
                  className="grid grid-cols-[44px_minmax(0,1fr)] gap-2.5 border-b border-[#f4f0f8] py-[15px] first:pt-0 last:border-b-0 last:pb-0"
                >
                  <RecuadroFecha fecha={solicitud.fecha} />
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-[11px] text-text">{solicitud.materia.nombre}</strong>
                      <Badge solicitud={solicitud} />
                    </div>
                    <p className="mb-1 mt-0 text-[10px] text-text-muted">
                      {solicitud.estudiante.nombreCompleto}
                      {solicitud.estudiante.correo ? ` · ${solicitud.estudiante.correo}` : ""}
                    </p>
                    <p className="mb-1 mt-0 text-[9px] text-[#8c849c]">
                      ◷ {textoHorario(solicitud)} · Pago: {solicitud.metodoPago.etiqueta}
                    </p>
                    <Mensaje solicitud={solicitud} />
                    <div className="mt-2">
                      <Acciones
                        solicitud={solicitud}
                        respondiendo={respondiendo}
                        onAceptar={aceptar}
                        onRechazar={abrirRechazo}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PanelLista>

      {aRechazar && (
        <ModalRechazar
          solicitud={aRechazar}
          onCerrar={() => setARechazar(null)}
          onConfirmar={rechazar}
        />
      )}
    </>
  );
};
