import { useEffect, useState } from "react";
import { useAuth } from "../../features/auth/auth-context.jsx";
import {
  esCancelacion,
  obtenerSesionesPublicas,
} from "../../features/tutorias-grupales/api-tutorias-grupales.js";
import { TarjetaSesionGrupal } from "../../features/tutorias-grupales/tarjeta-sesion-grupal.jsx";
import { EstadoCarga, EstadoVacio } from "../../features/solicitudes/lista-solicitudes.jsx";
import { claseBotonSecundario } from "../../features/solicitudes/estilos.js";

const Marco = ({ children }) => (
  <section className="rounded-card border border-[#eeeaf5] bg-white shadow-card">{children}</section>
);

export const TutoriasGrupales = () => {
  const { fijarUsuario } = useAuth();
  const [intento, setIntento] = useState(0);
  const [terminado, setTerminado] = useState(null);
  const cargando = terminado?.intento !== intento;
  const sesiones = cargando ? null : terminado?.sesiones;
  const error = cargando ? null : terminado?.error;

  useEffect(() => {
    const controlador = new AbortController();
    obtenerSesionesPublicas({ signal: controlador.signal })
      .then((respuesta) => setTerminado({ intento, sesiones: respuesta.sesiones }))
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

  return (
    <>
      <section className="mb-[21px] min-w-0">
        <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-primary">
          Tu espacio académico
        </span>
        <h1 className="mb-[7px] mt-[9px] font-heading text-[24px] tracking-[-0.8px] text-text max-[650px]:text-[22px]">
          Tutorías grupales
        </h1>
        <p className="m-0 max-w-[540px] text-[11px] leading-[1.7] text-text-muted">
          Aprende con otros estudiantes y comparte diferentes formas de resolver un problema.
        </p>
      </section>

      {cargando && (
        <Marco>
          <EstadoCarga texto="Cargando sesiones grupales…" />
        </Marco>
      )}

      {error && (
        <Marco>
          <EstadoVacio
            icono="!"
            titulo="No pudimos cargar las tutorías grupales"
            texto="Ocurrió un problema al consultar las sesiones. Inténtalo de nuevo."
          >
            <button type="button" onClick={() => setIntento((n) => n + 1)} className={claseBotonSecundario}>
              Reintentar
            </button>
          </EstadoVacio>
        </Marco>
      )}

      {sesiones && sesiones.length === 0 && (
        <Marco>
          <EstadoVacio
            icono="♧"
            titulo="Aún no hay sesiones grupales abiertas"
            texto="Cuando un tutor publique una sesión grupal, aparecerá aquí con su fecha y sus cupos."
          />
        </Marco>
      )}

      {sesiones && sesiones.length > 0 && (
        <>
          <div className="mb-[14px] flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 text-[13px]" aria-live="polite">
              Sesiones abiertas <span className="font-normal text-text-muted">({sesiones.length})</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-[17px] max-[900px]:grid-cols-1 max-[650px]:gap-[11px]">
            {sesiones.map((sesion) => (
              <TarjetaSesionGrupal key={sesion.id} sesion={sesion} />
            ))}
          </div>
        </>
      )}
    </>
  );
};
