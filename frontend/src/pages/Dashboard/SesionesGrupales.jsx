import { useEffect, useState } from "react";
import { useAuth } from "../../features/auth/auth-context.jsx";
import { horaLarga } from "../../features/disponibilidad/formato.js";
import {
  esCancelacion,
  obtenerMateriasParaSesion,
  obtenerMisSesiones,
} from "../../features/tutorias-grupales/api-tutorias-grupales.js";
import { ESTADOS_SESION } from "../../features/tutorias-grupales/constantes.js";
import { FormularioSesionGrupal } from "../../features/tutorias-grupales/formulario-sesion-grupal.jsx";
import {
  Aviso,
  EstadoCarga,
  EstadoVacio,
  PanelLista,
  RecuadroFecha,
} from "../../features/solicitudes/lista-solicitudes.jsx";
import { claseBotonSecundario } from "../../features/solicitudes/estilos.js";

const MENSAJE_PUBLICADA = "Sesión publicada. Los estudiantes ya pueden verla en Tutorías grupales.";

const PasoAntesDePublicar = ({ icono, titulo, texto }) => (
  <div className="flex items-start gap-[11px] py-[7px]">
    <span
      className="grid h-8 w-8 flex-none place-items-center rounded-[10px] bg-[#f4efff] text-[14px] text-primary"
      aria-hidden="true"
    >
      {icono}
    </span>
    <div>
      <strong className="block text-[10px] leading-[1.5] text-text">{titulo}</strong>
      <p className="mb-0 mt-1 text-[10px] leading-[1.5] text-text-muted">{texto}</p>
    </div>
  </div>
);

const FilaSesion = ({ sesion }) => {
  const estado = sesion.pasada
    ? { etiqueta: "Pasada", clase: "bg-status-neutral text-status-neutral-ink" }
    : ESTADOS_SESION[sesion.estado] ?? ESTADOS_SESION.abierta;
  return (
    <li className="grid grid-cols-[44px_minmax(0,1fr)] gap-2.5 border-b border-[#f4f0f8] py-[13px] first:pt-0 last:border-b-0 last:pb-0">
      <RecuadroFecha fecha={sesion.fecha} />
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
          <strong className="min-w-0 break-words text-[11px] text-text">{sesion.titulo}</strong>
          <span className={`whitespace-nowrap rounded-full px-2.5 py-[4px] text-[9px] font-bold ${estado.clase}`}>
            {estado.etiqueta}
          </span>
        </div>
        <p className="mb-1 mt-0 text-[10px] text-text-muted">{sesion.materia.nombre}</p>
        <p className="m-0 text-[9px] text-[#8c849c]">
          ◷ {horaLarga(sesion.horaInicio)} – {horaLarga(sesion.horaFin)} · {sesion.modalidad.etiqueta} ·{" "}
          {sesion.inscritos} / {sesion.cupo} cupos
        </p>
      </div>
    </li>
  );
};

export const SesionesGrupales = () => {
  const { fijarUsuario } = useAuth();
  const [intento, setIntento] = useState(0);
  const [terminado, setTerminado] = useState(null);
  const [aviso, setAviso] = useState(null);
  const cargando = terminado?.intento !== intento;
  // Mientras recarga tras publicar se sigue mostrando la lista anterior.
  const datos = terminado?.datos ?? null;
  const error = cargando ? null : terminado?.error;

  useEffect(() => {
    const controlador = new AbortController();
    const opciones = { signal: controlador.signal };
    Promise.all([obtenerMateriasParaSesion(opciones), obtenerMisSesiones(opciones)])
      .then(([materias, mias]) =>
        setTerminado({ intento, datos: { materias: materias.materias, sesiones: mias.sesiones } }),
      )
      .catch((fallo) => {
        if (esCancelacion(fallo)) return;
        if (fallo?.status === 401) {
          fijarUsuario(null);
          return;
        }
        setTerminado({ intento, error: fallo });
      });
    return () => controlador.abort();
  }, [intento, fijarUsuario]);

  const alPublicar = () => {
    setAviso(MENSAJE_PUBLICADA);
    setIntento((n) => n + 1);
  };

  return (
    <>
      <section className="mb-[21px] min-w-0">
        <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-primary">
          Mi espacio de tutor
        </span>
        <h1 className="mb-[7px] mt-[9px] font-heading text-[24px] tracking-[-0.8px] text-text max-[650px]:text-[22px]">
          Sesiones grupales
        </h1>
        <p className="m-0 max-w-[540px] text-[11px] leading-[1.7] text-text-muted">
          Crea un espacio para que varios estudiantes aprendan la misma materia contigo.
        </p>
      </section>

      {aviso && <Aviso>{aviso}</Aviso>}

      {!datos && !error && (
        <PanelLista titulo="Nueva sesión grupal">
          <EstadoCarga texto="Cargando…" />
        </PanelLista>
      )}

      {error && (
        <PanelLista titulo="Sesiones grupales">
          <EstadoVacio
            icono="!"
            titulo="No pudimos cargar tus sesiones"
            texto="Ocurrió un problema al consultar tus materias y sesiones. Inténtalo de nuevo."
          >
            <button type="button" onClick={() => setIntento((n) => n + 1)} className={claseBotonSecundario}>
              Reintentar
            </button>
          </EstadoVacio>
        </PanelLista>
      )}

      {datos && !error && (
        <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(260px,1fr)] items-start gap-[17px] max-[900px]:grid-cols-1">
          <section className="min-w-0 overflow-hidden rounded-card border border-[#eeeaf5] bg-white shadow-card">
            <div className="border-b border-[#f1edf6] px-5 py-[18px]">
              <h2 className="m-0 text-[13px] tracking-[-0.25px]">Nueva sesión grupal</h2>
              <p className="mb-0 mt-[5px] text-[10px] text-text-muted">Define el tema, la fecha y el cupo máximo.</p>
            </div>
            <div className="px-5 py-[18px] max-[650px]:px-[15px]">
              {datos.materias.length === 0 ? (
                <EstadoVacio
                  icono="♙"
                  titulo="Aún no tienes materias aprobadas"
                  texto="Podrás crear sesiones grupales cuando el administrador apruebe al menos una de tus materias."
                />
              ) : (
                <FormularioSesionGrupal
                  key={datos.materias.map((m) => m.id).join(",")}
                  materias={datos.materias}
                  onPublicada={alPublicar}
                />
              )}
            </div>
          </section>

          <div className="grid min-w-0 gap-[17px]">
            <PanelLista titulo="Antes de publicar">
              <PasoAntesDePublicar
                icono="▣"
                titulo="Elige una fecha clara"
                texto="No puede cruzarse con tus tutorías ni con los horarios que publicaste en Mi disponibilidad."
              />
              <PasoAntesDePublicar
                icono="♙"
                titulo="Define el cupo máximo"
                texto="La inscripción se deshabilita cuando se llenen todos los cupos."
              />
              <PasoAntesDePublicar
                icono="✓"
                titulo="Publica la sesión"
                texto="Los estudiantes podrán encontrarla en Tutorías grupales."
              />
            </PanelLista>

            <PanelLista
              titulo="Mis sesiones publicadas"
              pie={
                datos.sesiones.length > 0
                  ? `${datos.sesiones.length} ${datos.sesiones.length === 1 ? "sesión" : "sesiones"}`
                  : null
              }
            >
              {datos.sesiones.length === 0 ? (
                <EstadoVacio
                  icono="♧"
                  titulo="Tu próxima sesión empieza aquí"
                  texto="Las sesiones grupales que publiques aparecerán en esta sección."
                />
              ) : (
                <ul
                  aria-busy={cargando}
                  className={`m-0 list-none p-0 transition-opacity ${cargando ? "opacity-60" : ""}`}
                >
                  {datos.sesiones.map((sesion) => (
                    <FilaSesion key={sesion.id} sesion={sesion} />
                  ))}
                </ul>
              )}
            </PanelLista>
          </div>
        </div>
      )}
    </>
  );
};
