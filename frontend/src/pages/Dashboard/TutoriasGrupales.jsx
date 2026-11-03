import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/auth-context.jsx";
import { diaLargo, horaLarga } from "../../features/disponibilidad/formato.js";
import {
  esCancelacion,
  inscribirseSesion,
  obtenerMisInscripciones,
  obtenerSesionesPublicas,
} from "../../features/tutorias-grupales/api-tutorias-grupales.js";
import { TarjetaSesionGrupal } from "../../features/tutorias-grupales/tarjeta-sesion-grupal.jsx";
import {
  Aviso,
  EstadoCarga,
  EstadoVacio,
  PanelLista,
  RecuadroFecha,
} from "../../features/solicitudes/lista-solicitudes.jsx";
import { claseBotonSecundario } from "../../features/solicitudes/estilos.js";

const MENSAJE_INSCRITO = "Inscripción confirmada. Te esperamos en la sesión.";

const Marco = ({ children }) => (
  <section className="rounded-card border border-[#eeeaf5] bg-white shadow-card">{children}</section>
);

const FilaInscripcion = ({ sesion }) => (
  <li className="grid grid-cols-[44px_minmax(0,1fr)] gap-2.5 border-b border-[#f4f0f8] py-[13px] first:pt-0 last:border-b-0 last:pb-0">
    <RecuadroFecha fecha={sesion.fecha} />
    <div className="min-w-0">
      <strong className="block break-words text-[11px] text-text">{sesion.titulo}</strong>
      <p className="mb-1 mt-1 text-[10px] text-text-muted">
        {sesion.materia.nombre} · con{" "}
        <Link to={`/dashboard/buscar-tutores/${sesion.tutor.id}`} className="font-semibold text-primary hover:underline">
          {sesion.tutor.nombreCompleto}
        </Link>
      </p>
      <p className="m-0 text-[9px] text-[#8c849c]">
        ◷ {diaLargo(sesion.fecha)} · {horaLarga(sesion.horaInicio)} – {horaLarga(sesion.horaFin)} ·{" "}
        {sesion.modalidad.etiqueta}
      </p>
    </div>
  </li>
);

export const TutoriasGrupales = () => {
  const { fijarUsuario } = useAuth();
  const [intento, setIntento] = useState(0);
  const [terminado, setTerminado] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [inscribiendo, setInscribiendo] = useState(null);
  const cargando = terminado?.intento !== intento;
  // Mientras recarga tras inscribirse se sigue mostrando lo anterior.
  const datos = terminado?.datos ?? null;
  const error = cargando ? null : terminado?.error;

  useEffect(() => {
    const controlador = new AbortController();
    const opciones = { signal: controlador.signal };
    Promise.all([obtenerSesionesPublicas(opciones), obtenerMisInscripciones(opciones)])
      .then(([publicas, mias]) =>
        setTerminado({ intento, datos: { sesiones: publicas.sesiones, inscripciones: mias.sesiones } }),
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

  const inscribirse = async (sesion) => {
    if (inscribiendo) return;
    setInscribiendo(sesion.id);
    setAviso(null);
    try {
      await inscribirseSesion(sesion.id);
      setAviso({ tipo: "exito", texto: MENSAJE_INSCRITO });
    } catch (fallo) {
      if (fallo?.status === 401) {
        fijarUsuario(null);
        return;
      }
      setAviso({ tipo: "error", texto: fallo.message });
    } finally {
      setInscribiendo(null);
      // Tanto si se inscribió como si la sesión se llenó o cambió: datos frescos.
      setIntento((n) => n + 1);
    }
  };

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

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      {!datos && !error && (
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

      {datos && !error && (
        <>
          <div className="mb-[21px]">
            <PanelLista
              titulo="Mis inscripciones"
              pie={
                datos.inscripciones.length > 0
                  ? `${datos.inscripciones.length} ${datos.inscripciones.length === 1 ? "sesión próxima" : "sesiones próximas"}`
                  : null
              }
            >
              {datos.inscripciones.length === 0 ? (
                <p className="m-0 text-[10px] leading-[1.6] text-text-muted">
                  Aún no te has inscrito a ninguna sesión grupal. Elige una de la lista y pulsa “Inscribirme a la sesión”.
                </p>
              ) : (
                <ul className="m-0 list-none p-0">
                  {datos.inscripciones.map((sesion) => (
                    <FilaInscripcion key={sesion.id} sesion={sesion} />
                  ))}
                </ul>
              )}
            </PanelLista>
          </div>

          {datos.sesiones.length === 0 ? (
            <Marco>
              <EstadoVacio
                icono="♧"
                titulo="Aún no hay sesiones grupales abiertas"
                texto="Cuando un tutor publique una sesión grupal, aparecerá aquí con su fecha y sus cupos."
              />
            </Marco>
          ) : (
            <>
              <div className="mb-[14px] flex flex-wrap items-center justify-between gap-3">
                <h2 className="m-0 text-[13px]" aria-live="polite">
                  Sesiones disponibles <span className="font-normal text-text-muted">({datos.sesiones.length})</span>
                </h2>
                {cargando && (
                  <span role="status" className="text-[10px] text-text-muted">
                    Actualizando…
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-[17px] max-[900px]:grid-cols-1 max-[650px]:gap-[11px]">
                {datos.sesiones.map((sesion) => (
                  <TarjetaSesionGrupal
                    key={sesion.id}
                    sesion={sesion}
                    onInscribirse={inscribirse}
                    inscribiendo={inscribiendo === sesion.id}
                    bloqueado={Boolean(inscribiendo) || cargando}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
};
