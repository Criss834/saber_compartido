import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../features/auth/auth-context.jsx";
import {
  esCancelacion,
  guardarMiSemana,
  obtenerMiSemana,
} from "../../features/disponibilidad/api-disponibilidad.js";
import {
  CalendarioSemanal,
  NavegacionSemanas,
} from "../../features/disponibilidad/calendario-semanal.jsx";
import { claveBloque, rangoSemana } from "../../features/disponibilidad/formato.js";

const MENSAJE_CONFIRMADO =
  "No puedes modificar ni eliminar un bloque con una tutoría confirmada";
const MENSAJE_PENDIENTE =
  "Este bloque tiene una solicitud pendiente. Respóndela en “Solicitudes recibidas” antes de cambiarlo.";

// Bloques que el tutor no puede quitar: se envían siempre al guardar, para que
// el backend no los interprete como eliminados.
const ESTADOS_RETENIDOS = new Set(["confirmado", "pendiente"]);

const claseBotonPrimario =
  "inline-flex min-h-[39px] items-center justify-center gap-2 rounded-[10px] border-0 bg-primary px-[15px] text-[11px] font-bold text-white shadow-[0_7px_15px_rgba(124,58,237,0.19)] transition enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50";
const claseBotonSecundario =
  "inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition enabled:hover:-translate-y-px enabled:hover:border-[#d6c6f6] enabled:hover:bg-[#fbf9ff] disabled:cursor-not-allowed disabled:opacity-50";

const Panel = ({ titulo, subtitulo, extra, children }) => (
  <section className="min-w-0 overflow-hidden rounded-card border border-[#eeeaf5] bg-white shadow-card">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f1edf6] px-5 py-[18px]">
      <div className="min-w-0">
        <h2 className="m-0 text-[13px] tracking-[-0.25px]">{titulo}</h2>
        {subtitulo && (
          <p className="mb-0 mt-[5px] text-[10px] text-text-muted">{subtitulo}</p>
        )}
      </div>
      {extra}
    </div>
    <div className="px-5 py-[18px] max-[650px]:px-3">{children}</div>
  </section>
);

const Contador = ({ etiqueta, valor }) => (
  <div className="flex items-center justify-between gap-3 border-b border-[#f4f0f8] py-[11px]">
    <span className="text-[10px] text-text-muted">{etiqueta}</span>
    <strong className="text-[13px] text-text">{valor}</strong>
  </div>
);

const PasoComoFunciona = ({ icono, titulo, texto }) => (
  <div className="flex items-start gap-3 py-[9px]">
    <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] bg-icon-lilac text-[12px] font-bold text-icon-lilac-ink">
      {icono}
    </span>
    <div>
      <strong className="block text-[11px] text-text">{titulo}</strong>
      <p className="mb-0 mt-[3px] text-[10px] leading-[1.6] text-text-muted">{texto}</p>
    </div>
  </div>
);

const TONO_AVISO = {
  exito: "border-[#cdeed8] bg-status-success text-status-success-ink",
  error: "border-[#ffd6da] bg-status-danger text-status-danger-ink",
};

const Cargando = () => (
  <div role="status" className="flex min-h-[45vh] flex-col items-center justify-center gap-4">
    <span className="motion-safe:animate-spin h-7 w-7 rounded-full border-[3px] border-border border-t-primary" />
    <p className="text-text-muted">Cargando tu disponibilidad…</p>
  </div>
);

// Bloques marcados como disponibles según el servidor (los editables).
const marcadosDe = (datos) =>
  new Set(
    datos.dias.flatMap(({ fecha, bloques }) =>
      bloques
        .filter((bloque) => bloque.estado === "disponible")
        .map((bloque) => claveBloque(fecha, bloque.horaInicio)),
    ),
  );

const mismosElementos = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

export const MiDisponibilidad = () => {
  const { fijarUsuario } = useAuth();

  // `semana` null = la semana actual (la decide el servidor con la hora de Colombia).
  const [semana, setSemana] = useState(null);
  const [intento, setIntento] = useState(0);
  const [terminado, setTerminado] = useState(null);
  const claveCarga = `${semana ?? "actual"}:${intento}`;
  const cargando = terminado?.clave !== claveCarga;
  // Mientras carga otra semana se sigue mostrando la anterior, atenuada.
  const datos = terminado?.datos ?? null;
  const errorCarga = cargando ? null : terminado?.error;

  // Las ediciones se atan a la respuesta que las originó: al recargar o guardar
  // se descartan solas, sin efectos que sincronicen estado.
  const [edicion, setEdicion] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [semanaPendiente, setSemanaPendiente] = useState(null);

  useEffect(() => {
    const controlador = new AbortController();
    obtenerMiSemana(semana, { signal: controlador.signal })
      .then((respuesta) => setTerminado({ clave: claveCarga, datos: respuesta }))
      .catch((fallo) => {
        if (esCancelacion(fallo)) return;
        if (fallo?.status === 401) {
          fijarUsuario(null);
          return;
        }
        setTerminado({ clave: claveCarga, error: fallo });
      });
    return () => controlador.abort();
  }, [semana, claveCarga, fijarUsuario]);

  const guardados = useMemo(() => (datos ? marcadosDe(datos) : new Set()), [datos]);
  const marcados = edicion?.origen === terminado && edicion ? edicion.marcados : guardados;
  const hayCambios = Boolean(datos) && !mismosElementos(marcados, guardados);

  const dias = useMemo(
    () =>
      datos?.dias.map(({ fecha, bloques }) => ({
        fecha,
        bloques: bloques.map((bloque) => {
          if (bloque.estado !== "disponible" && bloque.estado !== "no_disponible") {
            return bloque;
          }
          const marcado = marcados.has(claveBloque(fecha, bloque.horaInicio));
          return { ...bloque, estado: marcado ? "disponible" : "no_disponible" };
        }),
      })) ?? [],
    [datos, marcados],
  );

  const conteo = useMemo(() => {
    const total = { disponible: 0, confirmado: 0, pendiente: 0, no_disponible: 0, pasado: 0 };
    for (const dia of dias) for (const bloque of dia.bloques) total[bloque.estado] += 1;
    return total;
  }, [dias]);

  const pulsarBloque = useCallback(
    (fecha, bloque) => {
      if (guardando || cargando) return;
      if (bloque.estado === "confirmado") {
        setAviso({ tipo: "error", texto: MENSAJE_CONFIRMADO });
        return;
      }
      if (bloque.estado === "pendiente") {
        setAviso({ tipo: "error", texto: MENSAJE_PENDIENTE });
        return;
      }
      if (bloque.estado === "pasado") return;
      const siguiente = new Set(marcados);
      const llave = claveBloque(fecha, bloque.horaInicio);
      if (siguiente.has(llave)) siguiente.delete(llave);
      else siguiente.add(llave);
      setEdicion({ origen: terminado, marcados: siguiente });
      setAviso(null);
    },
    [guardando, cargando, marcados, terminado],
  );

  const guardar = async () => {
    if (!datos || !hayCambios || guardando || cargando) return false;
    setGuardando(true);
    setAviso(null);
    const retenidos = datos.dias.flatMap(({ fecha, bloques: delDia }) =>
      delDia
        .filter((bloque) => ESTADOS_RETENIDOS.has(bloque.estado))
        .map((bloque) => ({ fecha, horaInicio: bloque.horaInicio })),
    );
    const bloques = [
      ...[...marcados].map((llave) => {
        const [fecha, horaInicio] = llave.split("T");
        return { fecha, horaInicio };
      }),
      ...retenidos,
    ];
    try {
      const respuesta = await guardarMiSemana(datos.semana, bloques);
      setTerminado({ clave: claveCarga, datos: respuesta });
      setEdicion(null);
      setAviso({
        tipo: "exito",
        texto: "Disponibilidad guardada. Los estudiantes ya pueden ver tus horarios libres.",
      });
      return true;
    } catch (fallo) {
      if (fallo?.status === 401) {
        fijarUsuario(null);
        return false;
      }
      setAviso({ tipo: "error", texto: fallo.message });
      // Un 409 significa que la semana cambió en el servidor: se recarga.
      if (fallo?.status === 409) setIntento((n) => n + 1);
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const cambiarSemana = (nueva) => {
    if (!nueva || nueva === datos?.semana) return;
    if (hayCambios) {
      setSemanaPendiente(nueva);
      return;
    }
    setAviso(null);
    setSemana(nueva);
  };

  const irASemanaPendiente = () => {
    setSemana(semanaPendiente);
    setSemanaPendiente(null);
    setEdicion(null);
  };

  const guardarYCambiar = async () => {
    if (await guardar()) irASemanaPendiente();
    else setSemanaPendiente(null);
  };

  const descartarYCambiar = () => {
    setAviso(null);
    irASemanaPendiente();
  };

  const botonGuardar = (texto, extraClase = "") => (
    <button
      type="button"
      onClick={guardar}
      disabled={!hayCambios || guardando || cargando}
      className={`${claseBotonPrimario} ${extraClase}`}
    >
      {guardando && (
        <span className="motion-safe:animate-spin h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white" />
      )}
      {guardando ? "Guardando…" : texto}
    </button>
  );

  const encabezado = (
    <section className="mb-[21px] flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-primary">
          Mi espacio de tutor
        </span>
        <h1 className="mb-[7px] mt-[9px] font-heading text-[24px] tracking-[-0.8px] text-text max-[650px]:text-[22px]">
          Mi disponibilidad
        </h1>
        <p className="m-0 max-w-[540px] text-[11px] leading-[1.7] text-text-muted">
          Publica los bloques de horario en los que puedes recibir solicitudes de tutoría.
        </p>
      </div>
      {botonGuardar("Guardar disponibilidad")}
    </section>
  );

  if (!datos && !errorCarga) {
    return (
      <>
        {encabezado}
        <Cargando />
      </>
    );
  }

  if (errorCarga) {
    return (
      <>
        {encabezado}
        <section className="rounded-card border border-[#eeeaf5] bg-white px-[15px] py-[35px] text-center shadow-card">
          <strong className="mb-[6px] block text-[12px] text-text">
            No pudimos cargar tu disponibilidad
          </strong>
          <p className="mx-auto mb-[14px] max-w-[290px] text-[10px] leading-[1.6] text-text-muted">
            {errorCarga.status === 400
              ? errorCarga.message
              : "Ocurrió un problema al consultar tu horario. Inténtalo de nuevo."}
          </p>
          <button
            type="button"
            onClick={() => {
              setSemana(null);
              setIntento((n) => n + 1);
            }}
            className={claseBotonSecundario}
          >
            Reintentar
          </button>
        </section>
      </>
    );
  }

  const esSemanaActual = datos.semana === datos.semanas[0];

  return (
    <>
      {encabezado}

      {aviso && (
        <div
          role={aviso.tipo === "error" ? "alert" : "status"}
          className={`mb-[17px] rounded-[12px] border px-4 py-3 text-[11px] font-semibold ${TONO_AVISO[aviso.tipo]}`}
        >
          {aviso.texto}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(250px,1fr)] items-start gap-[17px] max-[900px]:grid-cols-1">
        <Panel
          titulo="Horario semanal"
          subtitulo="Selecciona un bloque para cambiar su disponibilidad."
          extra={
            <span
              className={`rounded-full px-2.5 py-[5px] text-[9px] font-bold ${
                esSemanaActual
                  ? "bg-status-success text-status-success-ink"
                  : "bg-status-neutral text-status-neutral-ink"
              }`}
            >
              {esSemanaActual ? "Semana actual" : "Próximas semanas"}
            </span>
          }
        >
          <div className="mb-[14px] flex flex-wrap items-center justify-between gap-3">
            <NavegacionSemanas
              semana={datos.semana}
              semanas={datos.semanas}
              onCambiar={cambiarSemana}
              deshabilitada={guardando || Boolean(semanaPendiente)}
            />
            {cargando && (
              <span role="status" className="text-[10px] text-text-muted">
                Actualizando…
              </span>
            )}
          </div>

          {semanaPendiente && (
            <div
              role="alert"
              className="mb-[14px] rounded-[12px] border border-[#fde7b0] bg-status-pending px-4 py-3 text-[11px] text-status-pending-ink"
            >
              <strong className="block">Tienes cambios sin guardar en esta semana.</strong>
              <p className="mb-[10px] mt-1 text-[10px]">
                ¿Quieres guardarlos antes de ir a la semana del {rangoSemana(semanaPendiente)}?
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={guardarYCambiar}
                  disabled={guardando}
                  className={claseBotonPrimario}
                >
                  {guardando ? "Guardando…" : "Guardar y continuar"}
                </button>
                <button
                  type="button"
                  onClick={descartarYCambiar}
                  disabled={guardando}
                  className={claseBotonSecundario}
                >
                  Descartar cambios
                </button>
                <button
                  type="button"
                  onClick={() => setSemanaPendiente(null)}
                  disabled={guardando}
                  className={claseBotonSecundario}
                >
                  Quedarme aquí
                </button>
              </div>
            </div>
          )}

          <div className={cargando ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={cargando}>
            <CalendarioSemanal dias={dias} modo="edicion" onPulsarBloque={pulsarBloque} />
          </div>

          <div className="mt-4 rounded-[12px] border border-[#fde7b0] bg-status-pending px-4 py-3 text-[10px] font-semibold text-status-pending-ink">
            Los bloques con una tutoría confirmada no pueden modificarse ni eliminarse. Los que tienen una solicitud pendiente, tampoco, hasta que la respondas.
          </div>
        </Panel>

        <div className="grid min-w-0 gap-[17px]">
          <Panel titulo="Resumen de la semana">
            <Contador etiqueta="Bloques disponibles" valor={conteo.disponible} />
            <Contador etiqueta="Tutorías confirmadas" valor={conteo.confirmado} />
            <Contador etiqueta="Solicitudes pendientes" valor={conteo.pendiente} />
            <Contador etiqueta="No disponibles" valor={conteo.no_disponible} />
            <p className="mb-0 mt-3 text-[10px] leading-[1.6] text-text-muted">
              {hayCambios
                ? "Tienes cambios sin guardar."
                : "Al guardar, los estudiantes podrán consultar los bloques libres antes de solicitar una tutoría."}
            </p>
            {botonGuardar("Guardar cambios", "mt-[13px] w-full")}
          </Panel>

          <Panel titulo="Cómo funciona">
            <PasoComoFunciona
              icono="✓"
              titulo="Disponible"
              texto="Los estudiantes pueden solicitar ese horario."
            />
            <PasoComoFunciona
              icono="▣"
              titulo="Confirmada"
              texto="El bloque está reservado y no se puede editar."
            />
            <PasoComoFunciona
              icono="◷"
              titulo="Solicitud pendiente"
              texto="Un estudiante pidió ese horario. Acéptala o recházala en “Solicitudes recibidas”; mientras tanto no se puede quitar."
            />
            <PasoComoFunciona
              icono="×"
              titulo="No disponible"
              texto="El horario no aparecerá como opción para los estudiantes."
            />
          </Panel>
        </div>
      </div>
    </>
  );
};
