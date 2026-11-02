import { Link, useLocation } from "react-router-dom";
import { Avatar } from "../dashboard/avatar.jsx";
import { PROGRAMA_ACADEMICO } from "../tutor/constantes.js";
import { formatearNota } from "./formato.js";

export const MarcaVerificado = () => (
  <span
    className="inline-grid h-[15px] w-[15px] flex-none place-items-center rounded-full bg-status-success text-[10px] text-status-success-ink"
    role="img"
    aria-label="Tutor verificado"
    title="Tutor verificado"
  >
    ✓
  </span>
);

// Calificación de otros estudiantes (no la nota académica).
export const Calificacion = ({ calificacion, className = "" }) =>
  calificacion?.cantidad > 0 ? (
    <span
      className={`flex items-center gap-[7px] text-[10px] text-[#9b6809] ${className}`}
    >
      <span className="tracking-[1px] text-[#f5ab20]" aria-hidden="true">
        ★
      </span>
      <strong className="text-[11px]">
        {Number(calificacion.promedio).toFixed(1)}
      </strong>
      <span className="text-text-muted">
        ({calificacion.cantidad}{" "}
        {calificacion.cantidad === 1 ? "calificación" : "calificaciones"})
      </span>
    </span>
  ) : (
    <span className={`text-[10px] text-text-muted ${className}`}>
      Aún sin calificaciones
    </span>
  );

export const EtiquetaMateria = ({ materia, destacada = false }) => (
  <span
    className={`rounded-[6px] px-2 py-[5px] text-[9px] font-semibold ${
      destacada
        ? "bg-primary-light text-primary-dark ring-1 ring-[#e1d3ff]"
        : "bg-[#f5f1fc] text-[#72549e]"
    }`}
  >
    {materia.nombre} · {formatearNota(materia.promedio)}
  </span>
);

const claseBoton =
  "inline-flex min-h-[32px] items-center justify-center rounded-[10px] border px-[13px] text-[11px] font-bold transition";

export const TarjetaTutor = ({ tutor, materiaId }) => {
  // El perfil recibe la búsqueda actual para que "Volver" la conserve.
  const { search } = useLocation();
  const materiaElegida = materiaId
    ? tutor.materias.find((materia) => materia.id === materiaId)
    : null;

  return (
    <article className="flex min-w-0 flex-col rounded-[15px] border border-[#eeeaf5] bg-white p-[19px] shadow-[0_3px_15px_rgba(49,16,106,0.02)]">
      <div className="flex items-start gap-3">
        <Avatar
          nombre={tutor.nombreCompleto}
          size="size-[53px]"
          redondeo="rounded-[15px]"
          className="text-[13px]"
        />
        <div className="min-w-0 flex-1">
          <h3 className="m-0 flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-text">
            <span className="min-w-0 break-words">{tutor.nombreCompleto}</span>
            <MarcaVerificado />
          </h3>
          <p className="my-[5px] text-[10px] text-text-muted">
            {PROGRAMA_ACADEMICO}
          </p>
        </div>
      </div>

      <Calificacion calificacion={tutor.calificacion} className="my-[14px]" />

      {tutor.descripcion && (
        <p className="mb-[15px] mt-0 line-clamp-3 text-[10px] leading-[1.7] text-[#777086]">
          {tutor.descripcion}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5" aria-label="Materias aprobadas">
        {tutor.materias.map((materia) => (
          <EtiquetaMateria
            key={materia.id}
            materia={materia}
            destacada={materia.id === materiaId}
          />
        ))}
      </div>

      <div className="mt-auto pt-4" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#f0ebf6] pt-[13px]">
        <small className="text-[9px] text-[#92899f]">
          {materiaElegida ? (
            <>
              Promedio en {materiaElegida.nombre}:{" "}
              <strong className="text-text">
                {formatearNota(materiaElegida.promedio)}
              </strong>
            </>
          ) : (
            `${tutor.materias.length} ${
              tutor.materias.length === 1 ? "materia" : "materias"
            } verificadas`
          )}
        </small>
        <div className="flex gap-1.5">
          <Link
            to={`/dashboard/buscar-tutores/${tutor.id}`}
            state={{ busqueda: search }}
            className={`${claseBoton} border-border bg-white text-text hover:border-[#d6c6f6] hover:bg-[#fbf9ff]`}
          >
            Ver perfil
          </Link>
          <Link
            to={`/dashboard/buscar-tutores/${tutor.id}#disponibilidad`}
            state={{ busqueda: search }}
            className={`${claseBoton} border-transparent bg-accent text-white hover:bg-accent-dark`}
          >
            Solicitar
          </Link>
        </div>
      </div>
    </article>
  );
};
