import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/auth-context.jsx";
import { esCancelacion, obtenerDisponibilidadTutor } from "./api-disponibilidad.js";
import { CalendarioSemanal, NavegacionSemanas } from "./calendario-semanal.jsx";
import { DIAS_POR_SEMANA, sumarDias } from "./formato.js";

// Calendario público del perfil del tutor (008): solo bloques libres y futuros.
// Tiene su propia carga y error para no afectar al resto del perfil.
// Con `onSeleccionar`, cada bloque libre se puede elegir para solicitarlo (010);
// cambiar `version` vuelve a pedir los bloques (p. ej. tras un 409).

const lunesDeBloque = (semanas, fecha) =>
  [...semanas].reverse().find((lunes) => lunes <= fecha) ?? semanas[0];

const diasDeSemana = (lunes, bloques) =>
  Array.from({ length: DIAS_POR_SEMANA }, (_, indice) => {
    const fecha = sumarDias(lunes, indice);
    return {
      fecha,
      bloques: bloques
        .filter((bloque) => bloque.fecha === fecha)
        .map((bloque) => ({ ...bloque, estado: "disponible" })),
    };
  });

export const DisponibilidadPublica = ({ tutorId, version = 0, onSeleccionar, seleccionado = null }) => {
  const { fijarUsuario } = useAuth();
  const [intento, setIntento] = useState(0);
  const [terminado, setTerminado] = useState(null);
  const [semanaElegida, setSemanaElegida] = useState(null);
  const clave = `${tutorId}:${intento}:${version}`;
  const cargando = terminado?.clave !== clave;
  const datos = cargando ? null : terminado?.datos;
  const error = cargando ? null : terminado?.error;

  useEffect(() => {
    const controlador = new AbortController();
    obtenerDisponibilidadTutor(tutorId, { signal: controlador.signal })
      .then((respuesta) => setTerminado({ clave, datos: respuesta }))
      .catch((fallo) => {
        if (esCancelacion(fallo)) return;
        if (fallo?.status === 401) {
          fijarUsuario(null);
          return;
        }
        setTerminado({ clave, error: fallo });
      });
    return () => controlador.abort();
  }, [tutorId, clave, fijarUsuario]);

  // Se abre en la primera semana con bloques; luego, en la que elija el estudiante.
  const semana = useMemo(() => {
    if (!datos) return null;
    if (semanaElegida && datos.semanas.includes(semanaElegida)) return semanaElegida;
    return datos.bloques.length > 0
      ? lunesDeBloque(datos.semanas, datos.bloques[0].fecha)
      : datos.semanas[0];
  }, [datos, semanaElegida]);

  const dias = useMemo(
    () => (datos && semana ? diasDeSemana(semana, datos.bloques) : []),
    [datos, semana],
  );

  if (cargando) {
    return (
      <div role="status" className="flex items-center gap-3 py-4">
        <span className="motion-safe:animate-spin h-5 w-5 rounded-full border-[3px] border-border border-t-primary" />
        <p className="m-0 text-[11px] text-text-muted">Cargando horarios…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-3 text-center">
        <p className="mb-[10px] mt-0 text-[11px] text-text-muted">
          No pudimos cargar los horarios del tutor.
        </p>
        <button
          type="button"
          onClick={() => setIntento((n) => n + 1)}
          className="inline-flex min-h-[35px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (datos.bloques.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-5 text-center">
        <span className="grid h-[42px] w-[42px] place-items-center rounded-[13px] bg-icon-lilac text-[18px] text-icon-lilac-ink" aria-hidden="true">
          ◷
        </span>
        <strong className="text-[12px] text-text">
          Este tutor no tiene horarios disponibles por el momento
        </strong>
        <p className="m-0 max-w-[300px] text-[10px] leading-[1.6] text-text-muted">
          Vuelve más tarde: cuando publique sus bloques de horario aparecerán aquí.
        </p>
      </div>
    );
  }

  const enLaSemana = dias.reduce((total, dia) => total + dia.bloques.length, 0);

  return (
    <>
      <div className="mb-[14px] flex flex-wrap items-center justify-between gap-3">
        <NavegacionSemanas
          semana={semana}
          semanas={datos.semanas}
          onCambiar={setSemanaElegida}
        />
        <span className="text-[10px] text-text-muted">
          {enLaSemana === 0
            ? "Sin horarios libres esta semana"
            : `${enLaSemana} ${enLaSemana === 1 ? "horario libre" : "horarios libres"}`}
        </span>
      </div>
      <CalendarioSemanal
        dias={dias}
        modo="lectura"
        seleccionado={seleccionado}
        onPulsarBloque={onSeleccionar ? (_fecha, bloque) => onSeleccionar(bloque) : undefined}
      />
    </>
  );
};
