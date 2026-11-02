import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../features/auth/auth-context.jsx";
import {
  obtenerVerificacion,
  resolverVerificacion,
  reprocesarVerificacion,
  urlCertificado,
} from "../../features/verificacion/api-verificacion.js";
import { IndicadorRevision } from "../../features/verificacion/indicador-revision.jsx";

const FECHA_LARGA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const FECHA_HORA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

const formatearFecha = (valor) => {
  if (valor === null || valor === undefined || valor === "") return "";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "" : FECHA_LARGA.format(fecha);
};

const HORA = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

// Cuando todos los modelos de IA están sin cuota, el backend envía la hora en que
// vuelve a haberla; se explica eso en lugar de un "no se pudo procesar" genérico.
const mensajeCuotaAgotada = (iaDisponibleDesde) => {
  const fecha = iaDisponibleDesde ? new Date(iaDisponibleDesde) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return null;
  return `La cuota gratuita de la IA está agotada; se reintentará automáticamente desde las ${HORA.format(fecha)} (hora de Colombia). Mientras tanto puedes revisar el certificado a mano.`;
};

const formatearFechaHora = (valor) => {
  if (valor === null || valor === undefined || valor === "") return "—";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? "—"
    : FECHA_HORA.format(fecha);
};

const formatearPromedio = (valor) =>
  valor === null || valor === undefined ? "—" : Number(valor).toFixed(2);

const Dato = ({ etiqueta, valor }) => (
  <div className="border-b border-[#f4f0f8] py-[11px] last:border-b-0">
    <span className="mb-[4px] block text-[9px] font-extrabold uppercase tracking-[0.7px] text-[#a19ab0]">
      {etiqueta}
    </span>
    <strong className="block text-[11px] font-semibold text-text">
      {valor ?? "—"}
    </strong>
  </div>
);

const Cargando = () => (
  <div
    role="status"
    className="flex min-h-[45vh] flex-col items-center justify-center gap-4"
  >
    <span className="motion-safe:animate-spin h-7 w-7 rounded-full border-[3px] border-border border-t-primary" />
    <p className="text-text-muted">Cargando la solicitud…</p>
  </div>
);

const INTERVALO_SONDEO_MS = 3000;

const Ruedita = ({ className = "" }) => (
  <span
    aria-hidden="true"
    className={`inline-block shrink-0 motion-safe:animate-spin rounded-full ${className}`}
  />
);

const EstadoError = ({ error, onReintentar }) => (
  <div className="px-[15px] py-[35px] text-center">
    <strong className="mb-[6px] block text-[12px] text-text">
      {error?.status === 403
        ? "No tienes permiso para ver esta solicitud"
        : error?.status === 404
          ? "La solicitud no existe"
          : "No pudimos cargar la solicitud"}
    </strong>
    <p className="mx-auto mb-[14px] max-w-[270px] text-[10px] leading-[1.6] text-text-muted">
      {error?.status === 403
        ? "Esta sección es exclusiva del equipo de administración."
        : "Ocurrió un problema al consultar los datos. Inténtalo de nuevo."}
    </p>
    <div className="flex flex-wrap justify-center gap-[7px]">
      <Link
        to="/dashboard/admin/verificaciones"
        className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px"
      >
        Volver a la lista
      </Link>
      {error?.status !== 403 && error?.status !== 404 && (
        <button
          type="button"
          onClick={onReintentar}
          className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px"
        >
          Reintentar
        </button>
      )}
    </div>
  </div>
);

export const VerificacionDetalle = () => {
  const { id } = useParams();
  const { fijarUsuario } = useAuth();
  const [verificacion, setVerificacion] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);

  const [accion, setAccion] = useState(null);
  const [mensajeAccion, setMensajeAccion] = useState(null);
  const [confirmando, setConfirmando] = useState(null);
  const [sondeo, setSondeo] = useState(0);

  // procesadoEn previo al reproceso pedido; undefined = no se espera resultado.
  const esperandoResultado = useRef(undefined);

  const aplicarDetalle = useCallback((respuesta) => {
    setVerificacion(respuesta);
    if (respuesta.procesando || esperandoResultado.current === undefined) {
      return;
    }

    const antes = esperandoResultado.current;
    esperandoResultado.current = undefined;
    const despues = respuesta.extraido?.procesadoEn ?? null;

    if (despues && despues !== antes) {
      setMensajeAccion(
        respuesta.alertas.length > 0
          ? {
              tipo: "error",
              texto:
                "La IA leyó el certificado, pero hay datos que no coinciden. Revisa las alertas o vuelve a reprocesar.",
            }
          : {
              tipo: "exito",
              texto: "La IA leyó el certificado sin alertas.",
            },
      );
    } else {
      setMensajeAccion({
        tipo: "error",
        texto:
          mensajeCuotaAgotada(respuesta.iaDisponibleDesde) ??
          "La IA no pudo procesar el certificado. Puedes reprocesarlo o revisarlo a mano.",
      });
    }
  }, []);

  const recargar = useCallback(() => {
    setError(null);
    setCargando(true);
    setMensajeAccion(null);
    setIntento((anterior) => anterior + 1);
  }, []);

  useEffect(() => {
    let activo = true;

    obtenerVerificacion(id)
      .then((respuesta) => {
        if (!activo) return;
        setVerificacion(respuesta);
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
  }, [id, intento, fijarUsuario]);

  // Mientras la IA procesa, consulta el detalle cada pocos segundos hasta que termine.
  const procesando = Boolean(verificacion?.procesando);

  useEffect(() => {
    if (!procesando) return undefined;
    let activo = true;

    const temporizador = setTimeout(() => {
      obtenerVerificacion(id)
        .then((respuesta) => {
          if (!activo) return;
          aplicarDetalle(respuesta);
          setSondeo((anterior) => anterior + 1);
        })
        .catch((fallos) => {
          if (!activo) return;
          if (fallos?.status === 401) {
            fijarUsuario(null);
            return;
          }
          setSondeo((anterior) => anterior + 1);
        });
    }, INTERVALO_SONDEO_MS);

    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [procesando, sondeo, id, aplicarDetalle, fijarUsuario]);

  const ejecutar = useCallback(
    async (tipo) => {
      setAccion(tipo);
      setMensajeAccion(null);
      setConfirmando(null);

      try {
        if (tipo === "reprocesar") {
          esperandoResultado.current =
            verificacion?.extraido?.procesadoEn ?? null;
          await reprocesarVerificacion(id);
          aplicarDetalle(await obtenerVerificacion(id));
          return;
        }

        await resolverVerificacion(id, tipo);
        setMensajeAccion({
          tipo: "exito",
          texto:
            tipo === "aprobado"
              ? "Solicitud aprobada. El usuario ya puede actuar como tutor."
              : "Solicitud rechazada.",
        });
        await recargar();
      } catch (fallos) {
        if (tipo === "reprocesar") esperandoResultado.current = undefined;
        if (fallos?.status === 401) {
          fijarUsuario(null);
          return;
        }
        if (fallos?.codigo === "REPROCESO_EN_CURSO") {
          setVerificacion((anterior) =>
            anterior ? { ...anterior, procesando: true } : anterior,
          );
          return;
        }
        if (fallos?.status === 409) {
          setMensajeAccion({
            tipo: "error",
            texto:
              "La solicitud ya fue resuelta por otra persona. Recarga para ver el estado actual.",
          });
          return;
        }
        setMensajeAccion({
          tipo: "error",
          texto: fallos?.message ?? "No pudimos completar la acción.",
        });
      } finally {
        setAccion(null);
      }
    },
    [id, recargar, fijarUsuario, aplicarDetalle, verificacion],
  );

  if (cargando) {
    return (
      <>
        <BotonVolver />
        <Cargando />
      </>
    );
  }

  if (error) {
    return (
      <>
        <BotonVolver />
        <EstadoError error={error} onReintentar={recargar} />
      </>
    );
  }

  const cuentaNombre = [
    verificacion.cuenta?.nombres,
    verificacion.cuenta?.apellidos,
  ]
    .filter(Boolean)
    .join(" ");

  const nombreExtraido = [
    verificacion.extraido?.nombre,
    verificacion.extraido?.primerApellido,
    verificacion.extraido?.segundoApellido,
  ]
    .filter(Boolean)
    .join(" ");

  const resuelta = verificacion.estado !== "pendiente";
  const procesada = Boolean(verificacion.extraido?.procesadoEn);
  // Solo se puede reprocesar si la IA no está trabajando y el último resultado
  // falló (no procesada) o trajo datos que no coinciden (alertas).
  const puedeReprocesar =
    !procesando && (!procesada || verificacion.alertas.length > 0);

  return (
    <>
      <BotonVolver />

      <section className="mb-[21px] flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-primary">
            Verificación de tutores
          </span>
          <h1 className="mb-[7px] mt-[9px] font-heading text-[24px] tracking-[-0.8px] text-text max-[650px]:text-[22px]">
            {cuentaNombre}
          </h1>
          <p className="m-0 max-w-[540px] text-[11px] leading-[1.7] text-text-muted">
            {verificacion.materia} · Recibida el{" "}
            {formatearFecha(verificacion.creadoEn)}
          </p>
        </div>
        <IndicadorRevision indicador={verificacion.indicador} />
      </section>

      {mensajeAccion && (
        <div
          role="status"
          className={`mb-[17px] rounded-[10px] border px-[15px] py-[13px] text-[10px] leading-[1.6] ${
            mensajeAccion.tipo === "exito"
              ? "border-[#d1f2dc] bg-status-success text-status-success-ink"
              : mensajeAccion.tipo === "error"
                ? "border-[#ffedc0] bg-status-danger text-status-danger-ink"
                : "border-[#e9ddff] bg-primary-light text-purple-ink"
          }`}
        >
          {mensajeAccion.texto}
        </div>
      )}

      <div className="grid grid-cols-2 items-start gap-[17px] max-[900px]:grid-cols-1">
        <section className="min-w-0 overflow-hidden rounded-card border border-[#eeeaf5] bg-white shadow-card">
          <div className="border-b border-[#f1edf6] px-5 py-[18px]">
            <h2 className="m-0 text-[13px] tracking-[-0.25px]">
              Lo que declaró el estudiante
            </h2>
          </div>
          <div className="px-5 py-2">
            <Dato etiqueta="Nombre en la cuenta" valor={cuentaNombre} />
            <Dato etiqueta="Materia solicitada" valor={verificacion.materia} />
            <Dato
              etiqueta="Promedio declarado"
              valor={formatearPromedio(verificacion.promedioAcademico)}
            />
            <Dato
              etiqueta="Fecha de envío"
              valor={formatearFecha(verificacion.creadoEn)}
            />
            {verificacion.descripcion && (
              <Dato
                etiqueta="Descripción"
                valor={verificacion.descripcion}
              />
            )}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-card border border-[#eeeaf5] bg-white shadow-card">
          <div className="border-b border-[#f1edf6] px-5 py-[18px]">
            <h2 className="m-0 text-[13px] tracking-[-0.25px]">
              Lo que leyó la IA del certificado
            </h2>
          </div>
          <div className="px-5 py-2">
            {procesando ? (
              <div
                role="status"
                className="flex flex-col items-center justify-center gap-3 px-[15px] py-[25px] text-center"
              >
                <Ruedita className="h-7 w-7 border-[3px] border-border border-t-primary" />
                <p className="m-0 text-[10px] leading-[1.6] text-text-muted">
                  La IA está leyendo el certificado… esto puede tardar unos
                  segundos.
                </p>
              </div>
            ) : !procesada ? (
              <p className="px-[15px] py-[25px] text-center text-[10px] leading-[1.6] text-text-muted">
                {mensajeCuotaAgotada(verificacion.iaDisponibleDesde) ??
                  "Este certificado aún no ha sido procesado por la IA."}
              </p>
            ) : (
              <>
                <Dato
                  etiqueta="Nombre extraído"
                  valor={nombreExtraido || "—"}
                />
                <Dato
                  etiqueta="Materia encontrada"
                  valor={verificacion.extraido.materia}
                />
                <Dato
                  etiqueta="Promedio extraído"
                  valor={formatearPromedio(verificacion.extraido.promedio)}
                />
                <Dato
                  etiqueta="Firma detectada"
                  valor={
                    verificacion.extraido.firmaDetectada === null ||
                    verificacion.extraido.firmaDetectada === undefined
                      ? "—"
                      : verificacion.extraido.firmaDetectada
                        ? "Sí"
                        : "No"
                  }
                />
                <Dato
                  etiqueta="Procesado el"
                  valor={formatearFechaHora(verificacion.extraido.procesadoEn)}
                />
              </>
            )}
          </div>
        </section>
      </div>

      <section className="mt-[17px] min-w-0 overflow-hidden rounded-card border border-[#eeeaf5] bg-white shadow-card">
        <div className="border-b border-[#f1edf6] px-5 py-[18px]">
          <h2 className="m-0 text-[13px] tracking-[-0.25px]">
            Alertas de la revisión automática
          </h2>
          <p className="mb-0 mt-[5px] text-[10px] text-text-muted">
            La IA es un apoyo: confirma los datos con el certificado antes de
            decidir.
          </p>
        </div>
        <div className="px-5 py-[18px]">
          {procesando || !procesada ? (
            <p className="m-0 text-[10px] leading-[1.6] text-text-muted">
              {procesando
                ? "Las alertas aparecerán cuando la IA termine de leer el certificado."
                : (mensajeCuotaAgotada(verificacion.iaDisponibleDesde) ??
                  "Sin resultados de la IA: revisa el certificado a mano o reprocésalo.")}
            </p>
          ) : verificacion.alertas.length === 0 ? (
            <div className="rounded-[10px] border border-[#d1f2dc] bg-status-success px-[15px] py-[13px] text-[10px] leading-[1.6] text-status-success-ink">
              No se detectaron alertas automáticas.
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {verificacion.alertas.map((alerta, indice) => (
                <li
                  key={`${alerta.codigo}-${indice}`}
                  className="rounded-[8px] border border-[#ffedc0] bg-status-pending px-3 py-[10px] text-[10px] leading-[1.65] text-status-pending-ink"
                >
                  <strong className="font-bold">{alerta.codigo}</strong>
                  {" — "}
                  {alerta.mensaje}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-[17px] min-w-0 overflow-hidden rounded-card border border-[#eeeaf5] bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1edf6] px-5 py-[18px]">
          <div>
            <h2 className="m-0 text-[13px] tracking-[-0.25px]">
              Decisión sobre esta materia
            </h2>
            <p className="mb-0 mt-[5px] text-[10px] text-text-muted">
              {resuelta
                ? `Esta solicitud fue ${verificacion.estado}.`
                : "Aprueba o rechaza la solicitud. Esta acción no se puede deshacer."}
            </p>
          </div>
          <a
            href={urlCertificado(verificacion.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px"
          >
            Ver certificado ↗
          </a>
        </div>

        <div className="px-5 py-[18px]">
          {resuelta ? (
            <p className="m-0 text-[10px] leading-[1.6] text-text-muted">
              Estado actual:{" "}
              <strong className="text-text">{verificacion.estado}</strong>. Para
              cambiar la decisión, usa el botón de reprocesar solo si necesitas
              una nueva lectura del certificado.
            </p>
          ) : (
            <div className="flex flex-wrap gap-[7px]">
              {confirmando ? (
                <>
                  <span className="flex min-h-[39px] items-center text-[11px] font-semibold text-text">
                    {confirmando === "aprobado"
                      ? "¿Aprobar esta solicitud?"
                      : confirmando === "rechazado"
                        ? "¿Rechazar esta solicitud?"
                        : "¿Reprocesar el certificado con la IA?"}
                  </span>
                  <button
                    type="button"
                    disabled={
                      Boolean(accion) ||
                      (confirmando === "reprocesar" && !puedeReprocesar)
                    }
                    onClick={() => ejecutar(confirmando)}
                    className={`inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-transparent px-[15px] text-[11px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${
                      confirmando === "rechazado"
                        ? "bg-danger"
                        : confirmando === "reprocesar"
                          ? "bg-primary"
                          : "bg-success"
                    }`}
                  >
                    {accion ? "Procesando…" : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(accion)}
                    onClick={() => setConfirmando(null)}
                    className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={Boolean(accion)}
                    onClick={() => setConfirmando("aprobado")}
                    className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-transparent bg-success px-[15px] text-[11px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(accion)}
                    onClick={() => setConfirmando("rechazado")}
                    className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-transparent bg-danger px-[15px] text-[11px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(accion) || !puedeReprocesar}
                    aria-busy={procesando}
                    onClick={() => setConfirmando("reprocesar")}
                    className="inline-flex min-h-[39px] items-center justify-center gap-2 rounded-[10px] border border-transparent bg-primary px-[15px] text-[11px] font-bold text-white transition enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {(procesando || accion === "reprocesar") && (
                      <Ruedita className="h-[14px] w-[14px] border-2 border-white/40 border-t-white" />
                    )}
                    {procesando || accion === "reprocesar"
                      ? "Procesando con la IA…"
                      : "Reprocesar con la IA"}
                  </button>
                  {!procesando && !puedeReprocesar && (
                    <span className="flex min-h-[39px] basis-full items-center text-[10px] text-text-muted">
                      La IA leyó el certificado sin alertas; no hace falta
                      reprocesarlo.
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

const BotonVolver = () => (
  <Link
    to="/dashboard/admin/verificaciones"
    className="mb-[17px] inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px"
  >
    ← Volver a verificaciones
  </Link>
);
