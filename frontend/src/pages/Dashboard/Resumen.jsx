import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/auth-context.jsx";
import { obtenerResumen } from "../../features/dashboard/api-resumen.js";

const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

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

const IconoCalendario = (
  <svg {...svgBase}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </svg>
);

const IconoReloj = (
  <svg {...svgBase}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const IconoEstrella = (
  <svg {...svgBase}>
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
  </svg>
);

const IconoCalificacion = (
  <svg {...svgBase}>
    <path d="M21 12a8.5 8.5 0 1 1-4.2-7.3" />
    <path d="M8.5 12.5 11 15l7-7.5" />
  </svg>
);

const ESTILOS_BADGE = {
  pendiente: "bg-status-pending text-status-pending-ink",
  aceptada: "bg-status-success text-status-success-ink",
  completada: "bg-status-success text-status-success-ink",
  rechazada: "bg-status-danger text-status-danger-ink",
  cancelada: "bg-status-danger text-status-danger-ink",
};

const mayusculaInicial = (texto = "") =>
  texto.charAt(0).toUpperCase() + texto.slice(1);

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

const AccesoDirecto = ({ to, titulo, descripcion, icono, color }) => (
  <Link
    to={to}
    className="flex items-center gap-3 rounded-[14px] border border-[#eeeaf5] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card"
  >
    <span
      className={`grid h-[39px] w-[39px] flex-none place-items-center rounded-[11px] ${color}`}
    >
      {icono}
    </span>
    <span className="min-w-0">
      <strong className="mb-[5px] block text-[11px]">{titulo}</strong>
      <small className="block text-[10px] leading-[1.4] text-text-muted">
        {descripcion}
      </small>
    </span>
    <span className="ml-auto text-[16px] text-[#a49bb4]" aria-hidden="true">
      →
    </span>
  </Link>
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

const AccionPanel = ({ to, children }) => (
  <Link
    to={to}
    className="p-[5px] text-[10px] font-extrabold text-primary hover:underline"
  >
    {children}
  </Link>
);

const EstadoVacio = ({ titulo, texto, children }) => (
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
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12.5 11 15l7-7.5" />
      </svg>
    </span>
    <strong className="mb-[6px] block text-[12px] text-text">{titulo}</strong>
    <p className="mx-auto mb-[14px] max-w-[270px] text-[10px] leading-[1.6]">
      {texto}
    </p>
    {children}
  </div>
);

const FilaTutoria = ({ tutoria }) => {
  const [, mes, dia] = tutoria.fecha.split("-");

  return (
    <div className="grid grid-cols-[53px_minmax(0,1fr)_auto] items-center gap-[13px] border-b border-[#f4f0f8] py-[15px] last:border-b-0 max-[650px]:grid-cols-[44px_minmax(0,1fr)] max-[650px]:gap-[10px]">
      <span className="flex h-[58px] w-[52px] flex-col items-center justify-center rounded-[11px] bg-primary-light text-primary-dark max-[650px]:h-[51px] max-[650px]:w-[44px]">
        <small className="text-[9px] font-extrabold uppercase">
          {MESES[Number(mes) - 1] ?? ""}
        </small>
        <strong className="text-[20px] leading-tight">{dia}</strong>
      </span>

      <div className="min-w-0">
        <strong className="mb-[5px] block text-[11px]">
          {tutoria.materia}
        </strong>
        <p className="mb-[6px] text-[10px] text-text-muted">
          Con {tutoria.tutor.nombres} {tutoria.tutor.apellidos}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[9px] text-[#8c849c]">
          <span>
            {tutoria.horaInicio} – {tutoria.horaFin}
          </span>
        </div>
      </div>

      <span
        className={`w-fit justify-self-start whitespace-nowrap rounded-full px-2 py-[5px] text-[9px] font-bold max-[650px]:col-start-2 max-[650px]:mt-2 min-[651px]:justify-self-end ${
          ESTILOS_BADGE[tutoria.estado] ?? "bg-status-neutral text-status-neutral-ink"
        }`}
      >
        {mayusculaInicial(tutoria.estado)}
      </span>
    </div>
  );
};

const Cargando = () => (
  <div
    role="status"
    className="flex min-h-[45vh] flex-col items-center justify-center gap-4"
  >
    <span className="motion-safe:animate-spin h-7 w-7 rounded-full border-[3px] border-border border-t-primary" />
    <p className="text-text-muted">Cargando tu resumen…</p>
  </div>
);

export const Resumen = () => {
  const { usuario, fijarUsuario } = useAuth();
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
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

    obtenerResumen()
      .then((respuesta) => {
        if (!activo) return;
        setDatos(respuesta);
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

  const nombres = usuario?.nombres ?? "";

  return (
    <>
      <section className="relative mb-[21px] flex items-center justify-between gap-[18px] overflow-hidden rounded-[18px] bg-[linear-gradient(110deg,#4f259f_0%,#7c3aed_65%,#9a69ee_100%)] px-[27px] py-[25px] text-white shadow-[0_10px_22px_rgba(111,54,208,0.1)] max-[650px]:flex-col max-[650px]:items-start max-[650px]:p-[21px]">
        <div className="relative z-[1]">
          <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-[#e2d3ff]">
            ¡Qué bueno tenerte de vuelta!
          </span>
          <h2 className="mb-[7px] mt-[9px] text-[24px] tracking-[-0.8px] max-[650px]:text-[22px]">
            Hola, {nombres}
          </h2>
          <p className="m-0 max-w-[490px] text-[11px] leading-[1.7] text-[#e9ddff]">
            Tu próximo gran avance empieza con una pregunta. Encuentra un
            tutor, organiza tus sesiones y sigue aprendiendo a tu ritmo.
          </p>
        </div>
        <div className="relative z-[1] flex flex-wrap gap-[9px] max-[650px]:w-full">
          <button
            type="button"
            onClick={() => navigate("/dashboard/buscar-tutores")}
            className="inline-flex min-h-[39px] items-center justify-center gap-2 rounded-[10px] border border-transparent bg-accent px-[15px] text-[11px] font-bold text-white shadow-[0_5px_12px_rgba(255,90,140,0.15)] transition hover:-translate-y-px"
          >
            Buscar un tutor
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard/mis-tutorias")}
            className="inline-flex min-h-[39px] items-center justify-center gap-2 rounded-[10px] border border-white/[0.27] bg-white/[0.09] px-[15px] text-[11px] font-bold text-white transition hover:-translate-y-px"
          >
            Solicitar tutoría
          </button>
        </div>
      </section>

      {cargando && <Cargando />}

      {!cargando && error && (
        <div className="px-[15px] py-[35px] text-center">
          <strong className="mb-[6px] block text-[12px] text-text">
            No pudimos cargar tu resumen
          </strong>
          <p className="mx-auto mb-[14px] max-w-[270px] text-[10px] leading-[1.6] text-text-muted">
            Ocurrió un problema al consultar tus datos. Inténtalo de nuevo.
          </p>
          <button
            type="button"
            onClick={recargar}
            className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px"
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && datos && (
        <>
          <div className="mb-5 grid grid-cols-4 gap-[17px] max-[1200px]:grid-cols-2 max-[650px]:gap-[10px]">
            <TarjetaEstadistica
              etiqueta="Tutorías programadas"
              valor={datos.tutoriasProgramadas}
              pie="Solicitudes pendientes y aceptadas"
              icono={IconoCalendario}
              color="bg-icon-lilac text-icon-lilac-ink"
            />
            <TarjetaEstadistica
              etiqueta="Horas de aprendizaje"
              valor={datos.horasAprendizaje}
              pie="De tus tutorías aceptadas"
              icono={IconoReloj}
              color="bg-icon-pink text-icon-pink-ink"
            />
            <TarjetaEstadistica
              etiqueta="Tutores favoritos"
              valor={datos.tutoresFavoritos}
              pie="Personas que te ayudan a crecer"
              icono={IconoEstrella}
              color="bg-icon-green text-icon-green-ink"
            />
            <TarjetaEstadistica
              etiqueta="Pendientes por calificar"
              valor={datos.pendientesPorCalificar}
              pie="Tu opinión importa"
              icono={IconoCalificacion}
              color="bg-icon-amber text-icon-amber-ink"
            />
          </div>

          <div className="mb-5 grid grid-cols-3 gap-[17px] max-[900px]:gap-[10px] max-[650px]:grid-cols-1 max-[650px]:gap-[9px]">
            <AccesoDirecto
              to="/dashboard/buscar-tutores"
              titulo="Encontrar un tutor"
              descripcion="Busca apoyo por materia"
              icono={
                <svg {...svgBase}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20.5 20.5-4-4" />
                </svg>
              }
              color="bg-icon-lilac text-icon-lilac-ink"
            />
            <AccesoDirecto
              to="/dashboard/mis-tutorias"
              titulo="Mis tutorías"
              descripcion="Consulta tus próximas sesiones"
              icono={IconoCalendario}
              color="bg-icon-pink text-icon-pink-ink"
            />
            <AccesoDirecto
              to="/dashboard/tutorias-grupales"
              titulo="Aprender en grupo"
              descripcion="Únete a una sesión grupal"
              icono={
                <svg {...svgBase}>
                  <circle cx="9" cy="8" r="3.5" />
                  <path d="M2.5 20.5v-1a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v1" />
                  <path d="M16.5 4.9a3.5 3.5 0 0 1 0 6.2" />
                  <path d="M18.5 14.7a4.7 4.7 0 0 1 3 4.4v1.4" />
                </svg>
              }
              color="bg-icon-green text-icon-green-ink"
            />
          </div>

          <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(260px,1fr)] items-start gap-[17px] max-[900px]:grid-cols-1">
            <div className="grid gap-[17px]">
              <Panel
                titulo="Próximas tutorías"
                subtitulo="Tus siguientes espacios de aprendizaje"
                accion={
                  <AccionPanel to="/dashboard/mis-tutorias">
                    Ver todas
                  </AccionPanel>
                }
              >
                {datos.proximasTutorias.length === 0 ? (
                  <EstadoVacio
                    titulo="Aún no tienes tutorías programadas"
                    texto="Cuando un tutor acepte tu solicitud, verás aquí los detalles de tu sesión."
                  >
                    <Link
                      to="/dashboard/buscar-tutores"
                      className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px"
                    >
                      Buscar un tutor
                    </Link>
                  </EstadoVacio>
                ) : (
                  <div className="flex flex-col">
                    {datos.proximasTutorias.map((tutoria) => (
                      <FilaTutoria key={tutoria.id} tutoria={tutoria} />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel
                titulo="Tutores recomendados"
                accion={
                  <AccionPanel to="/dashboard/buscar-tutores">
                    Explorar todos
                  </AccionPanel>
                }
              >
                <EstadoVacio
                  titulo="Aún no hay recomendaciones"
                  texto="Cuando exista la función de recomendaciones, verás aquí perfiles que encajan con tus materias."
                />
              </Panel>
            </div>

            <div className="grid gap-[17px]">
              <Panel
                titulo="Actividad reciente"
                accion={<AccionPanel to="/dashboard/notificaciones">Ver todas</AccionPanel>}
              >
                <EstadoVacio
                  titulo="Sin novedades por ahora"
                  texto="Las confirmaciones, cambios y recordatorios de tus tutorías aparecerán aquí."
                />
              </Panel>
            </div>
          </div>
        </>
      )}
    </>
  );
};
