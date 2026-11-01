import { FILTROS } from "./use-busqueda.js";

const IconoLupa = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4 flex-none text-[#9a91ab]"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20.5 20.5-4-4" />
  </svg>
);

const claseCampo =
  "min-h-[38px] rounded-[9px] border border-border bg-white px-[11px] text-[11px] text-text focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/10";

export const BotonLimpiarFiltros = ({ onLimpiar }) => (
  <button
    type="button"
    onClick={onLimpiar}
    className="inline-flex min-h-[38px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px hover:border-[#d6c6f6]"
  >
    Limpiar filtros
  </button>
);

export const FiltrosBusqueda = ({
  texto,
  onTexto,
  materias,
  materiaId,
  onMateria,
  filtro,
  onFiltro,
  hayFiltros,
  onLimpiar,
}) => (
  <form
    role="search"
    aria-label="Buscar tutores"
    onSubmit={(evento) => evento.preventDefault()}
    className="mb-[18px] flex flex-wrap items-center gap-2.5"
  >
    <label className="flex min-h-[38px] min-w-[180px] flex-[2] items-center gap-2 rounded-[9px] border border-border bg-white px-[11px] focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/10 max-[650px]:basis-full">
      {IconoLupa}
      <span className="sr-only">Buscar por nombre o materia</span>
      <input
        type="search"
        value={texto}
        maxLength={80}
        onChange={(evento) => onTexto(evento.target.value)}
        placeholder="Busca por nombre o materia…"
        className="w-full min-w-0 border-0 bg-transparent text-[11px] text-text outline-none"
      />
    </label>

    <label className="flex min-w-[150px] flex-1 max-[650px]:basis-full">
      <span className="sr-only">Materia</span>
      <select
        value={materiaId ?? ""}
        onChange={(evento) => onMateria(Number(evento.target.value) || null)}
        className={`${claseCampo} w-full`}
      >
        <option value="">Todas las materias</option>
        {materiaId && !materias.some((materia) => materia.id === materiaId) && (
          // Llega por la URL una materia sin tutores: se refleja igual en el selector.
          <option value={materiaId}>Materia seleccionada</option>
        )}
        {materias.map((materia) => (
          <option key={materia.id} value={materia.id}>
            {materia.nombre}
          </option>
        ))}
      </select>
    </label>

    <label className="flex min-w-[150px] flex-1 max-[650px]:basis-full">
      <span className="sr-only">Calificación o promedio</span>
      <select
        value={filtro}
        onChange={(evento) => onFiltro(evento.target.value)}
        className={`${claseCampo} w-full`}
      >
        {FILTROS.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </label>

    {hayFiltros && <BotonLimpiarFiltros onLimpiar={onLimpiar} />}
  </form>
);
