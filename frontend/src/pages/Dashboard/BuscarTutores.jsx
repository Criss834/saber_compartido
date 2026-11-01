import { Link } from "react-router-dom";
import { useBusqueda } from "../../features/busqueda/use-busqueda.js";
import {
  BotonLimpiarFiltros,
  FiltrosBusqueda,
} from "../../features/busqueda/filtros-busqueda.jsx";
import { TarjetaTutor } from "../../features/busqueda/tarjeta-tutor.jsx";

const IconoVacio = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-[22px] w-[22px]"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20.5 20.5-4-4" />
  </svg>
);

const Cargando = () => (
  <div
    role="status"
    className="flex min-h-[35vh] flex-col items-center justify-center gap-4"
  >
    <span className="motion-safe:animate-spin h-7 w-7 rounded-full border-[3px] border-border border-t-primary" />
    <p className="text-text-muted">Buscando tutores…</p>
  </div>
);

const Panel = ({ children }) => (
  <section className="rounded-card border border-[#eeeaf5] bg-white px-[15px] py-[35px] text-center shadow-card">
    {children}
  </section>
);

const EstadoError = ({ onReintentar }) => (
  <Panel>
    <strong className="mb-[6px] block text-[12px] text-text">
      No pudimos cargar los tutores
    </strong>
    <p className="mx-auto mb-[14px] max-w-[270px] text-[10px] leading-[1.6] text-text-muted">
      Ocurrió un problema al consultar la búsqueda. Inténtalo de nuevo.
    </p>
    <button
      type="button"
      onClick={onReintentar}
      className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px"
    >
      Reintentar
    </button>
  </Panel>
);

const EstadoVacio = ({ titulo, texto, children }) => (
  <Panel>
    <span className="mx-auto mb-3 grid h-[50px] w-[50px] place-items-center rounded-[15px] bg-primary-light text-primary">
      {IconoVacio}
    </span>
    <strong className="mb-[6px] block text-[12px] text-text">{titulo}</strong>
    <p className="mx-auto mb-[14px] max-w-[300px] text-[10px] leading-[1.6] text-[#8c849c]">
      {texto}
    </p>
    {children}
  </Panel>
);

// Tres vacíos distintos: materia sin tutores, filtros sin coincidencias, y
// plataforma sin ningún tutor verificado todavía.
const Vacio = ({ busqueda }) => {
  const { materiaId, materias, q, filtro, hayFiltros, limpiarFiltros } =
    busqueda;
  const materiaSinTutores =
    materiaId &&
    (!materias.some((materia) => materia.id === materiaId) ||
      (!q.trim() && filtro === "todos"));

  if (materiaSinTutores) {
    return (
      <EstadoVacio
        titulo="No hay tutores disponibles para esta materia"
        texto="Todavía nadie está verificado para enseñarla. Prueba con otra materia."
      >
        <BotonLimpiarFiltros onLimpiar={limpiarFiltros} />
      </EstadoVacio>
    );
  }

  if (hayFiltros) {
    return (
      <EstadoVacio
        titulo="No encontramos tutores con esos filtros"
        texto={
          filtro === "calificacion"
            ? "Aún hay pocas calificaciones en la plataforma: prueba quitando el filtro de calificación."
            : "Prueba con otra materia o elimina algunos filtros de búsqueda."
        }
      >
        <BotonLimpiarFiltros onLimpiar={limpiarFiltros} />
      </EstadoVacio>
    );
  }

  return (
    <EstadoVacio
      titulo="Aún no hay tutores verificados"
      texto="Cuando el equipo verifique a los primeros tutores, aparecerán aquí. ¿Dominas una materia? Postúlate para enseñarla."
    >
      <Link
        to="/dashboard/ser-tutor"
        className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-transparent bg-accent px-[15px] text-[11px] font-bold text-white shadow-[0_5px_12px_rgba(255,90,140,0.15)] transition hover:-translate-y-px hover:bg-accent-dark"
      >
        Quiero ser tutor
      </Link>
    </EstadoVacio>
  );
};

export const BuscarTutores = () => {
  const busqueda = useBusqueda();
  const { resultado, error, cargando, materiaId } = busqueda;

  const tutores = resultado?.tutores ?? [];
  const total = resultado?.total ?? 0;
  const primeraCarga = cargando && !resultado;

  return (
    <>
      <section className="mb-[21px] flex flex-wrap items-start justify-between gap-3 max-[650px]:flex-col max-[650px]:items-stretch">
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-primary">
            Tu espacio académico
          </span>
          <h1 className="mb-[7px] mt-[9px] font-heading text-[24px] tracking-[-0.8px] text-text max-[650px]:text-[22px]">
            Encuentra a tu próximo tutor
          </h1>
          <p className="m-0 max-w-[540px] text-[11px] leading-[1.7] text-text-muted">
            Personas de tu institución listas para compartir lo que saben.
          </p>
        </div>
        <Link
          to="/dashboard/ser-tutor"
          className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px hover:border-[#d6c6f6] hover:bg-[#fbf9ff]"
        >
          ＋ Ser tutor
        </Link>
      </section>

      <FiltrosBusqueda
        texto={busqueda.texto}
        onTexto={busqueda.setTexto}
        materias={busqueda.materias}
        materiaId={materiaId}
        onMateria={busqueda.elegirMateria}
        filtro={busqueda.filtro}
        onFiltro={busqueda.elegirFiltro}
        hayFiltros={busqueda.hayFiltros}
        onLimpiar={busqueda.limpiarFiltros}
      />

      {!primeraCarga && !error && (
        <div className="mb-[14px] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-[13px]" aria-live="polite">
              Tutores verificados{" "}
              <span className="font-normal text-text-muted">({total})</span>
            </h2>
            <p className="mb-0 mt-[5px] text-[10px] text-text-muted">
              {total > tutores.length
                ? `Mostrando los ${tutores.length} mejor calificados de ${total}.`
                : "Perfiles verificados por la plataforma."}
            </p>
          </div>
          <span className="rounded-full bg-status-success px-2.5 py-[5px] text-[9px] font-bold text-status-success-ink">
            ✓ Verificados
          </span>
        </div>
      )}

      {primeraCarga && <Cargando />}
      {!cargando && error && <EstadoError onReintentar={busqueda.reintentar} />}
      {!primeraCarga && !error && tutores.length === 0 && !cargando && (
        <Vacio busqueda={busqueda} />
      )}

      {!primeraCarga && !error && tutores.length > 0 && (
        <div
          aria-busy={cargando}
          className={`grid grid-cols-2 gap-[17px] transition-opacity max-[900px]:grid-cols-1 max-[650px]:gap-[11px] ${
            cargando ? "opacity-60" : ""
          }`}
        >
          {tutores.map((tutor) => (
            <TarjetaTutor key={tutor.id} tutor={tutor} materiaId={materiaId} />
          ))}
        </div>
      )}
    </>
  );
};
