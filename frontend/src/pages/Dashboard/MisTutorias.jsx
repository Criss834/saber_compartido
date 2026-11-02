import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { obtenerEnviadas } from "../../features/solicitudes/api-solicitudes.js";
import { textoHorario } from "../../features/solicitudes/formato.js";
import {
  Aviso,
  Badge,
  EstadoCarga,
  EstadoVacio,
  PanelLista,
  Pestanas,
  RecuadroFecha,
} from "../../features/solicitudes/lista-solicitudes.jsx";
import { claseBotonSecundario } from "../../features/solicitudes/estilos.js";
import { useListaSolicitudes } from "../../features/solicitudes/use-lista-solicitudes.js";

const claseBotonAcento =
  "inline-flex min-h-[39px] items-center justify-center rounded-[10px] bg-accent px-[15px] text-[11px] font-bold text-white shadow-[0_7px_15px_rgba(255,90,140,0.22)] transition hover:-translate-y-px";

const FilaTutoria = ({ solicitud }) => (
  <li className="grid grid-cols-[53px_minmax(0,1fr)_auto] items-center gap-[13px] border-b border-[#f4f0f8] py-[15px] first:pt-0 last:border-b-0 last:pb-0 max-[650px]:grid-cols-[44px_minmax(0,1fr)] max-[650px]:gap-2.5">
    <RecuadroFecha fecha={solicitud.fecha} />
    <div className="min-w-0">
      <strong className="mb-[5px] block text-[11px] leading-[1.5] text-text">
        {solicitud.materia.nombre}
      </strong>
      <p className="mb-[6px] mt-0 text-[10px] text-text-muted">
        Con{" "}
        <Link
          to={`/dashboard/buscar-tutores/${solicitud.tutor.id}`}
          className="font-semibold text-primary hover:underline"
        >
          {solicitud.tutor.nombreCompleto}
        </Link>{" "}
        · Individual
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-[#8c849c]">
        <span>◷ {textoHorario(solicitud)}</span>
        <span>· Pago: {solicitud.metodoPago.etiqueta}</span>
      </div>
      {solicitud.tutor.correo && (
        <p className="mb-0 mt-[6px] text-[10px] text-status-success-ink">
          Escríbele para coordinar la sesión:{" "}
          <span className="select-all font-semibold">{solicitud.tutor.correo}</span>
        </p>
      )}
      {solicitud.estado === "rechazada" && solicitud.motivoRechazo && (
        <p className="mb-0 mt-[6px] text-[10px] text-status-danger-ink">
          Motivo del tutor: {solicitud.motivoRechazo}
        </p>
      )}
      {solicitud.vencida && (
        <p className="mb-0 mt-[6px] text-[10px] text-text-muted">
          El tutor no respondió antes de la hora de la tutoría.
        </p>
      )}
    </div>
    <div className="flex flex-col items-end gap-[7px] max-[650px]:col-start-2 max-[650px]:flex-row max-[650px]:items-center">
      <Badge solicitud={solicitud} />
    </div>
  </li>
);

export const MisTutorias = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const lista = useListaSolicitudes(obtenerEnviadas);
  const { estado, solicitudes, cargando, error } = lista;

  // El mensaje de "Solicitud enviada" llega una sola vez desde el perfil del
  // tutor; se quita del historial para que no reaparezca al recargar.
  const [aviso] = useState(location.state?.aviso ?? null);
  useEffect(() => {
    if (location.state?.aviso) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location, navigate]);

  return (
    <>
      <section className="mb-[21px] flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-primary">
            Tu espacio académico
          </span>
          <h1 className="mb-[7px] mt-[9px] font-heading text-[24px] tracking-[-0.8px] text-text max-[650px]:text-[22px]">
            Mis tutorías
          </h1>
          <p className="m-0 max-w-[540px] text-[11px] leading-[1.7] text-text-muted">
            Consulta el estado, el horario y los detalles de tus sesiones.
          </p>
        </div>
        <Link to="/dashboard/buscar-tutores" className={claseBotonAcento}>
          ＋ Solicitar tutoría
        </Link>
      </section>

      {aviso && <Aviso>{aviso}</Aviso>}

      <Pestanas estado={estado} onCambiar={lista.cambiarEstado} />

      <PanelLista
        titulo="Tus sesiones"
        pie={
          solicitudes && !error
            ? `${solicitudes.length} ${solicitudes.length === 1 ? "sesión" : "sesiones"} en la vista`
            : null
        }
      >
        {!solicitudes && !error && <EstadoCarga texto="Cargando tus tutorías…" />}

        {error && (
          <EstadoVacio
            icono="!"
            titulo="No pudimos cargar tus tutorías"
            texto="Ocurrió un problema al consultar tus solicitudes. Inténtalo de nuevo."
          >
            <button type="button" onClick={lista.recargar} className={claseBotonSecundario}>
              Reintentar
            </button>
          </EstadoVacio>
        )}

        {solicitudes && !error && solicitudes.length === 0 && (
          <EstadoVacio
            icono="▣"
            titulo={estado ? "No hay tutorías en esta categoría" : "Aún no has solicitado tutorías"}
            texto={
              estado
                ? "Cuando tengas sesiones en este estado, aparecerán aquí."
                : "Busca un tutor, elige un horario libre en su calendario y envíale una solicitud."
            }
          >
            <Link to="/dashboard/buscar-tutores" className={claseBotonAcento}>
              Buscar tutor
            </Link>
          </EstadoVacio>
        )}

        {solicitudes && !error && solicitudes.length > 0 && (
          <ul
            aria-busy={cargando}
            className={`m-0 list-none p-0 transition-opacity ${cargando ? "opacity-60" : ""}`}
          >
            {solicitudes.map((solicitud) => (
              <FilaTutoria key={solicitud.id} solicitud={solicitud} />
            ))}
          </ul>
        )}
      </PanelLista>
    </>
  );
};
