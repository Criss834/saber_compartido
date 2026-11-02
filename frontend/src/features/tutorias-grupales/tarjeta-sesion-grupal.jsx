import { Link } from "react-router-dom";
import { diaLargo, horaLarga } from "../disponibilidad/formato.js";
import { modalidadDe } from "./constantes.js";

// Tarjeta de "Tutorías grupales" del prototipo (`groupsView`): icono, nombre,
// materia, badge de cupos, tutor, fecha y duración, descripción, barra de
// ocupación e "Inscribirme". La inscripción llega en la 012.

const Dato = ({ icono, titulo, children }) => (
  <div className="flex items-start gap-[11px]">
    <span
      className="grid h-8 w-8 flex-none place-items-center rounded-[10px] bg-[#f4efff] text-[14px] text-primary"
      aria-hidden="true"
    >
      {icono}
    </span>
    <div className="min-w-0">
      <strong className="block text-[10px] leading-[1.5] text-text">{titulo}</strong>
      <p className="mb-0 mt-1 text-[10px] leading-[1.5] text-text-muted">{children}</p>
    </div>
  </div>
);

export const TarjetaSesionGrupal = ({ sesion }) => {
  const ocupacion = sesion.cupo > 0 ? Math.round((sesion.inscritos / sesion.cupo) * 100) : 0;
  const hayCupos = sesion.disponibles > 0;
  const modalidad = modalidadDe(sesion.modalidad.clave);

  return (
    <article className="flex min-w-0 flex-col rounded-[15px] border border-[#eeeaf5] bg-white p-[19px] shadow-[0_3px_15px_rgba(49,16,106,0.02)]">
      <div className="flex items-start gap-3">
        <span
          className="grid h-[49px] w-[49px] flex-none place-items-center rounded-[11px] bg-icon-lilac text-[22px] text-icon-lilac-ink"
          aria-hidden="true"
        >
          ♧
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block break-words text-[12px] text-text">{sesion.titulo}</strong>
          <p className="mb-0 mt-1 text-[10px] leading-[1.5] text-text-muted">{sesion.materia.nombre}</p>
        </div>
        <span
          className={`whitespace-nowrap rounded-full px-2.5 py-[5px] text-[9px] font-bold ${
            hayCupos
              ? "bg-status-success text-status-success-ink"
              : "bg-status-pending text-status-pending-ink"
          }`}
        >
          {hayCupos ? "Cupos abiertos" : "Cupos llenos"}
        </span>
      </div>

      <div className="my-[15px] h-px bg-[#f0ebf6]" />

      <div className="grid gap-3">
        <Dato icono="♙" titulo={
          <Link to={`/dashboard/buscar-tutores/${sesion.tutor.id}`} className="text-primary hover:underline">
            {sesion.tutor.nombreCompleto}
          </Link>
        }>
          Tutor verificado
        </Dato>
        <Dato icono="▣" titulo={`${diaLargo(sesion.fecha)} · ${horaLarga(sesion.horaInicio)}`}>
          Duración: {sesion.duracionMinutos} minutos (hasta las {horaLarga(sesion.horaFin)})
        </Dato>
        <Dato icono={modalidad.icono} titulo={sesion.modalidad.etiqueta}>
          {modalidad.detalle}
        </Dato>
      </div>

      {sesion.descripcion && (
        <p className="mb-0 mt-3 line-clamp-3 text-[10px] leading-[1.6] text-[#777086]" title={sesion.descripcion}>
          {sesion.descripcion}
        </p>
      )}

      <div className="my-4">
        <div className="mb-2 flex justify-between gap-2.5 text-[10px]">
          <strong className="text-text">Ocupación</strong>
          <span className="text-text-muted">
            {sesion.inscritos} / {sesion.cupo} cupos
          </span>
        </div>
        <div
          className="h-[7px] overflow-hidden rounded-[10px] bg-[#f0edf5]"
          role="progressbar"
          aria-label="Ocupación de la sesión"
          aria-valuemin={0}
          aria-valuemax={sesion.cupo}
          aria-valuenow={sesion.inscritos}
        >
          <span className="block h-full rounded-[10px] bg-primary" style={{ width: `${ocupacion}%` }} />
        </div>
      </div>

      <button
        type="button"
        disabled
        title="La inscripción a sesiones grupales estará disponible próximamente"
        className="mt-auto inline-flex min-h-[39px] cursor-not-allowed items-center justify-center gap-1.5 rounded-[10px] bg-accent px-[15px] text-[11px] font-bold text-white opacity-55"
      >
        Inscribirme a la sesión
        <span className="rounded-full bg-white/25 px-1.5 py-px text-[8px] font-extrabold uppercase tracking-[0.4px]">
          Próximamente
        </span>
      </button>
    </article>
  );
};
