import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/auth-context.jsx";
import { obtenerVerificaciones } from "../../features/verificacion/api-verificacion.js";
import { IndicadorRevision } from "../../features/verificacion/indicador-revision.jsx";

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

const formatearPromedio = (valor) =>
  valor === null || valor === undefined ? "—" : Number(valor).toFixed(2);

const TarjetaVerificacion = ({ verificacion }) => (
  <article className="rounded-[13px] border border-[#eeeaf5] bg-white p-[17px] shadow-card">
    <div className="flex items-start justify-between gap-[10px] max-[650px]:flex-col">
      <div className="min-w-0">
        <h3 className="m-0 text-[13px] tracking-[-0.25px] text-text">
          {[verificacion.cuenta?.nombres, verificacion.cuenta?.apellidos]
            .filter(Boolean)
            .join(" ")}
        </h3>
        <p className="mb-0 mt-[4px] text-[10px] text-text-muted">
          {verificacion.materia}
        </p>
      </div>
      <IndicadorRevision indicador={verificacion.indicador} />
    </div>

    <div className="my-3 flex flex-wrap gap-[7px]">
      <span className="rounded-full bg-bg-soft px-2 py-[5px] text-[9px] font-semibold text-purple-ink">
        Promedio declarado: {formatearPromedio(verificacion.promedioAcademico)}
      </span>
      <span className="rounded-full bg-bg-soft px-2 py-[5px] text-[9px] font-semibold text-purple-ink">
        Recibida: {formatearFecha(verificacion.creadoEn)}
      </span>
    </div>

    <div className="mt-[13px] flex flex-wrap gap-[7px]">
      <Link
        to={`/dashboard/admin/verificaciones/${verificacion.id}`}
        className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px"
      >
        Ver detalle
      </Link>
    </div>
  </article>
);

const Cargando = () => (
  <div
    role="status"
    className="flex min-h-[45vh] flex-col items-center justify-center gap-4"
  >
    <span className="motion-safe:animate-spin h-7 w-7 rounded-full border-[3px] border-border border-t-primary" />
    <p className="text-text-muted">Cargando verificaciones…</p>
  </div>
);

const EstadoError = ({ error, onReintentar }) => (
  <div className="px-[15px] py-[35px] text-center">
    <strong className="mb-[6px] block text-[12px] text-text">
      {error?.status === 403
        ? "No tienes permiso para ver esta sección"
        : "No pudimos cargar las verificaciones"}
    </strong>
    <p className="mx-auto mb-[14px] max-w-[270px] text-[10px] leading-[1.6] text-text-muted">
      {error?.status === 403
        ? "Esta sección es exclusiva del equipo de administración."
        : "Ocurrió un problema al consultar las solicitudes. Inténtalo de nuevo."}
    </p>
    {error?.status !== 403 && (
      <button
        type="button"
        onClick={onReintentar}
        className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px"
      >
        Reintentar
      </button>
    )}
  </div>
);

const EstadoVacio = () => (
  <div className="px-[15px] py-[35px] text-center text-[#8c849c]">
    <span className="mx-auto mb-3 grid h-[50px] w-[50px] place-items-center rounded-[15px] bg-primary-light text-primary">
      <svg
        viewBox="0 0 24 24"
        className="h-[22px] w-[22px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 11.5 11 13.5 15.5 9" />
        <path d="M12 21.5a9 9 0 1 0-8.5-6.2" />
        <path d="M3 21.5v-5h5" />
      </svg>
    </span>
    <strong className="mb-[6px] block text-[12px] text-text">
      No hay solicitudes pendientes
    </strong>
    <p className="mx-auto mb-0 max-w-[270px] text-[10px] leading-[1.6]">
      Las nuevas postulaciones de tutores aparecerán aquí.
    </p>
  </div>
);

export const Verificaciones = () => {
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
        setVerificaciones(respuesta);
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

  return (
    <>
      <section className="mb-[21px]">
        <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-primary">
          Centro de gestión
        </span>
        <h1 className="mb-[7px] mt-[9px] font-heading text-[24px] tracking-[-0.8px] text-text max-[650px]:text-[22px]">
          Verificación de tutores
        </h1>
        <p className="m-0 max-w-[540px] text-[11px] leading-[1.7] text-text-muted">
          Revisa los datos extraídos del certificado y toma una decisión sobre
          cada solicitud.
        </p>
      </section>

      <section className="min-w-0 overflow-hidden rounded-card border border-[#eeeaf5] bg-white shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-[#f1edf6] px-5 py-[18px]">
          <div>
            <h2 className="m-0 text-[13px] tracking-[-0.25px]">
              Solicitudes recibidas
            </h2>
            <p className="mb-0 mt-[5px] text-[10px] text-text-muted">
              Solicitudes con estado pendiente
            </p>
          </div>
          {!cargando && !error && (
            <span className="flex-none rounded-full bg-bg-soft px-2.5 py-[5px] text-[9px] font-bold text-purple-ink">
              {verificaciones.length} solicitudes
            </span>
          )}
        </div>

        <div className="px-5 py-[18px]">
          {cargando && <Cargando />}
          {!cargando && error && (
            <EstadoError error={error} onReintentar={recargar} />
          )}
          {!cargando && !error && verificaciones.length === 0 && (
            <EstadoVacio />
          )}

          {!cargando && !error && verificaciones.length > 0 && (
            <div className="flex flex-col gap-[11px]">
              {verificaciones.map((verificacion) => (
                <TarjetaVerificacion
                  key={verificacion.id}
                  verificacion={verificacion}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};
