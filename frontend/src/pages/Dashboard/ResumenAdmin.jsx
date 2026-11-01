import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/auth-context.jsx";
import { obtenerVerificaciones } from "../../features/verificacion/api-verificacion.js";
import { IndicadorRevision } from "../../features/verificacion/indicador-revision.jsx";

const REQUIERE_REVISION = "Requiere revisión manual";
const MAXIMO_RECIENTES = 3;

const FECHA_LARGA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const formatearFecha = (valor) => {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "" : FECHA_LARGA.format(fecha);
};

const svgBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-[18px] w-[18px]",
  "aria-hidden": true,
};

const IconoReloj = (
  <svg {...svgBase}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const IconoAlerta = (
  <svg {...svgBase}>
    <path d="M5 21V4" />
    <path d="M5 4h11l-2 4 2 4H5" />
  </svg>
);

const IconoVerificado = (
  <svg {...svgBase}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5 11 15l4.5-5" />
  </svg>
);

const IconoAjustes = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-[23px] w-[23px]"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
);

const TarjetaEstadistica = ({ etiqueta, valor, pie, icono, color }) => (
  <article className="min-w-0 rounded-card border border-[#eeeaf5] bg-white p-[18px] pb-4 shadow-card">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold text-text-muted">
        {etiqueta}
      </span>
      <span
        className={`grid h-9 w-9 flex-none place-items-center rounded-[11px] ${color}`}
      >
        {icono}
      </span>
    </div>
    <p className="mb-[7px] mt-3 text-[28px] font-extrabold tracking-[-1px] text-text">
      {valor}
    </p>
    <span className="text-[10px] text-[#8b849b]">{pie}</span>
  </article>
);

const Panel = ({ titulo, subtitulo, accion, children }) => (
  <section className="min-w-0 overflow-hidden rounded-card border border-[#eeeaf5] bg-white shadow-card">
    <div className="flex items-center justify-between gap-3 border-b border-[#f1edf6] px-5 py-[18px]">
      <div>
        <h2 className="m-0 text-[13px] tracking-[-0.25px]">{titulo}</h2>
        {subtitulo && (
          <p className="mb-0 mt-[5px] text-[10px] text-text-muted">
            {subtitulo}
          </p>
        )}
      </div>
      {accion}
    </div>
    <div className="px-5 py-[18px]">{children}</div>
  </section>
);

const FilaSolicitud = ({ verificacion }) => (
  <Link
    to={`/dashboard/admin/verificaciones/${verificacion.id}`}
    className="flex items-center justify-between gap-3 border-b border-[#f4f0f8] py-[13px] transition-colors last:border-b-0 hover:text-primary max-[650px]:flex-col max-[650px]:items-start"
  >
    <span className="min-w-0">
      <strong className="mb-[4px] block truncate text-[11px]">
        {[verificacion.cuenta?.nombres, verificacion.cuenta?.apellidos]
          .filter(Boolean)
          .join(" ")}
      </strong>
      <small className="block text-[10px] text-text-muted">
        {verificacion.materia} · Recibida el{" "}
        {formatearFecha(verificacion.creadoEn)}
      </small>
    </span>
    <IndicadorRevision indicador={verificacion.indicador} />
  </Link>
);

const Cargando = () => (
  <div
    role="status"
    className="flex min-h-[25vh] flex-col items-center justify-center gap-4"
  >
    <span className="motion-safe:animate-spin h-7 w-7 rounded-full border-[3px] border-border border-t-primary" />
    <p className="text-text-muted">Cargando el resumen…</p>
  </div>
);

const EstadoError = ({ onReintentar }) => (
  <div className="px-[15px] py-[35px] text-center">
    <strong className="mb-[6px] block text-[12px] text-text">
      No pudimos cargar el resumen
    </strong>
    <p className="mx-auto mb-[14px] max-w-[270px] text-[10px] leading-[1.6] text-text-muted">
      Ocurrió un problema al consultar las solicitudes. Inténtalo de nuevo.
    </p>
    <button
      type="button"
      onClick={onReintentar}
      className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px"
    >
      Reintentar
    </button>
  </div>
);

export const ResumenAdmin = () => {
  const { fijarUsuario } = useAuth();
  const [verificaciones, setVerificaciones] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);

  const recargar = useCallback(() => {
    setError(null);
    setCargando(true);
    setIntento((anterior) => anterior + 1);
  }, []);

  useEffect(() => {
    let activo = true;

    obtenerVerificaciones()
      .then((respuesta) => {
        if (!activo) return;
        setVerificaciones(Array.isArray(respuesta) ? respuesta : []);
        setCargando(false);
      })
      .catch((fallos) => {
        if (!activo) return;
        setCargando(false);
        if (fallos?.status === 401) {
          fijarUsuario(null);
          return;
        }
        setError(fallos);
      });

    return () => {
      activo = false;
    };
  }, [intento, fijarUsuario]);

  const pendientes = verificaciones.length;
  const conAlertas = verificaciones.filter(
    (verificacion) => verificacion.indicador === REQUIERE_REVISION,
  ).length;
  const recientes = [...verificaciones]
    .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn))
    .slice(0, MAXIMO_RECIENTES);

  return (
    <>
      <section className="mb-5 flex items-center justify-between gap-[18px] rounded-card bg-[linear-gradient(115deg,#3f1c83,#6b35c2)] px-[25px] py-[22px] text-white max-[650px]:p-[18px]">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-[#e1d1ff]">
            Panel de administración
          </span>
          <h2 className="mb-[7px] mt-[9px] text-[19px] tracking-[-0.5px] max-[650px]:text-[17px]">
            Hola, equipo de gestión
          </h2>
          <p className="m-0 text-[10px] leading-[1.6] text-[#e6dafa]">
            Revisa las solicitudes de verificación y mantén la comunidad
            académica confiable.
          </p>
        </div>
        <span className="grid h-[47px] w-[47px] flex-none place-items-center rounded-[11px] bg-white/10 text-white max-[650px]:hidden">
          {IconoAjustes}
        </span>
      </section>

      {cargando && <Cargando />}
      {!cargando && error && <EstadoError onReintentar={recargar} />}

      {!cargando && !error && (
        <>
          <div className="mb-5 grid grid-cols-3 gap-[17px] max-[900px]:grid-cols-1 max-[900px]:gap-[10px]">
            <TarjetaEstadistica
              etiqueta="Solicitudes por revisar"
              valor={pendientes}
              pie="Requieren atención administrativa"
              icono={IconoReloj}
              color="bg-icon-amber text-icon-amber-ink"
            />
            <TarjetaEstadistica
              etiqueta="Casos con alertas"
              valor={conAlertas}
              pie="Revisión manual recomendada"
              icono={IconoAlerta}
              color="bg-icon-pink text-icon-pink-ink"
            />
            <TarjetaEstadistica
              etiqueta="Sin alertas"
              valor={pendientes - conAlertas}
              pie="La IA no encontró diferencias"
              icono={IconoVerificado}
              color="bg-icon-green text-icon-green-ink"
            />
          </div>

          <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start gap-[17px] max-[900px]:grid-cols-1">
            <Panel
              titulo="Solicitudes de verificación"
              subtitulo="Las más recientes que requieren revisión"
              accion={
                <Link
                  to="/dashboard/admin/verificaciones"
                  className="p-[5px] text-[10px] font-extrabold text-primary hover:underline"
                >
                  Ver todas
                </Link>
              }
            >
              {recientes.length === 0 ? (
                <div className="px-[15px] py-[25px] text-center">
                  <strong className="mb-[6px] block text-[12px] text-text">
                    No hay solicitudes pendientes
                  </strong>
                  <p className="m-0 text-[10px] leading-[1.6] text-text-muted">
                    Las nuevas postulaciones aparecerán aquí.
                  </p>
                </div>
              ) : (
                recientes.map((verificacion) => (
                  <FilaSolicitud
                    key={verificacion.id}
                    verificacion={verificacion}
                  />
                ))
              )}
            </Panel>

            <Panel titulo="Cómo funciona la verificación">
              <ul className="m-0 flex list-none flex-col gap-[13px] p-0">
                <li className="flex items-start gap-[11px]">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-[9px] bg-icon-lilac text-[12px] text-icon-lilac-ink">
                    1
                  </span>
                  <p className="m-0 text-[10px] leading-[1.6] text-text-muted">
                    <strong className="block text-[11px] text-text">
                      La IA lee el certificado
                    </strong>
                    Extrae nombre, materias y notas, y las compara con lo
                    declarado.
                  </p>
                </li>
                <li className="flex items-start gap-[11px]">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-[9px] bg-icon-amber text-[12px] text-icon-amber-ink">
                    2
                  </span>
                  <p className="m-0 text-[10px] leading-[1.6] text-text-muted">
                    <strong className="block text-[11px] text-text">
                      Revisas las alertas
                    </strong>
                    Confirma los datos contra el certificado original.
                  </p>
                </li>
                <li className="flex items-start gap-[11px]">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-[9px] bg-icon-green text-[12px] text-icon-green-ink">
                    3
                  </span>
                  <p className="m-0 text-[10px] leading-[1.6] text-text-muted">
                    <strong className="block text-[11px] text-text">
                      Decides por materia
                    </strong>
                    La aprobación final siempre es manual.
                  </p>
                </li>
              </ul>
            </Panel>
          </div>
        </>
      )}
    </>
  );
};
