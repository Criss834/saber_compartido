import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/auth-context.jsx";
import { diaLargo, horaLarga } from "../../features/disponibilidad/formato.js";
import {
  esCancelacion,
  obtenerMisSesiones,
} from "../../features/tutorias-grupales/api-tutorias-grupales.js";
import { ESTADOS_SESION } from "../../features/tutorias-grupales/constantes.js";
import {
  EstadoCarga,
  EstadoVacio,
  RecuadroFecha,
} from "../../features/solicitudes/lista-solicitudes.jsx";
import { claseBotonSecundario } from "../../features/solicitudes/estilos.js";

// "Mis sesiones grupales" del tutor: todas sus sesiones a todo el ancho, cada una
// con su ocupación y la tabla de inscritos (nombre y correo) ya visible.

const PESTANAS = [
  { clave: "proximas", etiqueta: "Próximas" },
  { clave: "pasadas", etiqueta: "Pasadas" },
  { clave: "todas", etiqueta: "Todas" },
];

const formatoInscripcion = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
const inscritoEl = (valor) => formatoInscripcion.format(new Date(valor)).replace(/\./g, "");

const claseBotonAcento =
  "inline-flex min-h-[39px] items-center justify-center rounded-[10px] bg-accent px-[15px] text-[11px] font-bold text-white shadow-[0_7px_15px_rgba(255,90,140,0.22)] transition hover:-translate-y-px";

const Estadistica = ({ etiqueta, valor, pie, icono, color }) => (
  <div className="flex min-w-0 items-start justify-between gap-3 rounded-card border border-[#eeeaf5] bg-white p-[17px] shadow-card">
    <div className="min-w-0">
      <span className="block text-[10px] font-semibold text-text-muted">{etiqueta}</span>
      <strong className="mt-1.5 block font-heading text-[24px] leading-none tracking-[-0.8px] text-text">{valor}</strong>
      <small className="mt-2 block text-[9px] text-text-muted">{pie}</small>
    </div>
    <span className={`grid h-[39px] w-[39px] flex-none place-items-center rounded-[11px] text-[17px] ${color}`} aria-hidden="true">
      {icono}
    </span>
  </div>
);

const CopiarCorreos = ({ correos }) => {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(correos.join(", "));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };
  return (
    <button
      type="button"
      onClick={copiar}
      className="inline-flex min-h-[31px] items-center justify-center rounded-[8px] border border-border bg-white px-3 text-[10px] font-bold text-text transition hover:border-[#d6c6f6] hover:bg-[#fbf9ff]"
    >
      {copiado ? "✓ Correos copiados" : "Copiar correos"}
    </button>
  );
};

const TablaInscritos = ({ inscritos }) => (
  <>
    {/* Escritorio: tabla */}
    <div className="overflow-x-auto max-[650px]:hidden">
      <table className="w-full min-w-[520px] border-collapse">
        <thead>
          <tr>
            {["#", "Estudiante", "Correo institucional", "Inscrito el"].map((columna) => (
              <th
                key={columna}
                scope="col"
                className="whitespace-nowrap bg-[#fcfbfe] px-3 py-2.5 text-left text-[9px] font-extrabold uppercase tracking-[0.65px] text-[#958ca7]"
              >
                {columna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inscritos.map((inscrito, indice) => (
            <tr key={inscrito.correo}>
              <td className="border-t border-[#f0edf5] px-3 py-2.5 text-[10px] text-text-muted">{indice + 1}</td>
              <td className="border-t border-[#f0edf5] px-3 py-2.5 text-[10px] font-semibold text-text">{inscrito.nombreCompleto}</td>
              <td className="select-all border-t border-[#f0edf5] px-3 py-2.5 text-[10px] text-text">{inscrito.correo}</td>
              <td className="whitespace-nowrap border-t border-[#f0edf5] px-3 py-2.5 text-[10px] text-text-muted">
                {inscritoEl(inscrito.inscritoEn)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {/* Móvil: lista */}
    <ol className="m-0 hidden list-none p-0 max-[650px]:grid max-[650px]:gap-2">
      {inscritos.map((inscrito, indice) => (
        <li key={inscrito.correo} className="rounded-[10px] border border-[#f0edf5] px-3 py-2 text-[10px]">
          <strong className="text-text">
            {indice + 1}. {inscrito.nombreCompleto}
          </strong>
          <span className="block select-all break-all text-text-muted">{inscrito.correo}</span>
        </li>
      ))}
    </ol>
  </>
);

const TarjetaSesion = ({ sesion }) => {
  const estado = sesion.pasada
    ? { etiqueta: "Pasada", clase: "bg-status-neutral text-status-neutral-ink" }
    : ESTADOS_SESION[sesion.estado] ?? ESTADOS_SESION.abierta;
  const ocupacion = sesion.cupo > 0 ? Math.round((sesion.inscritos / sesion.cupo) * 100) : 0;

  return (
    <article className="min-w-0 overflow-hidden rounded-card border border-[#eeeaf5] bg-white shadow-card">
      <div className="grid grid-cols-[53px_minmax(0,1fr)] gap-[13px] px-5 py-[18px] max-[650px]:grid-cols-[44px_minmax(0,1fr)] max-[650px]:px-[15px]">
        <RecuadroFecha fecha={sesion.fecha} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="m-0 break-words text-[14px] tracking-[-0.25px] text-text">{sesion.titulo}</h2>
              <p className="mb-0 mt-1 text-[10px] text-text-muted">{sesion.materia.nombre}</p>
            </div>
            <span className={`whitespace-nowrap rounded-full px-2.5 py-[5px] text-[9px] font-bold ${estado.clase}`}>
              {estado.etiqueta}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#8c849c]">
            <span>◷ {diaLargo(sesion.fecha)} · {horaLarga(sesion.horaInicio)} – {horaLarga(sesion.horaFin)}</span>
            <span>· {sesion.duracionMinutos} minutos</span>
            <span>· {sesion.modalidad.etiqueta}</span>
          </div>
          {sesion.descripcion && (
            <p className="mb-0 mt-2 text-[10px] leading-[1.6] text-[#777086]">{sesion.descripcion}</p>
          )}
          <div className="mt-3 max-w-[420px]">
            <div className="mb-1.5 flex justify-between gap-2.5 text-[10px]">
              <strong className="text-text">Ocupación</strong>
              <span className="text-text-muted">
                {sesion.inscritos} / {sesion.cupo} cupos
              </span>
            </div>
            <div className="h-[7px] overflow-hidden rounded-[10px] bg-[#f0edf5]">
              <span className="block h-full rounded-[10px] bg-primary" style={{ width: `${ocupacion}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#f1edf6] px-5 py-[15px] max-[650px]:px-[15px]">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <strong className="text-[11px] text-text">Inscritos ({sesion.listaInscritos.length})</strong>
          {sesion.listaInscritos.length > 0 && (
            <CopiarCorreos correos={sesion.listaInscritos.map((inscrito) => inscrito.correo)} />
          )}
        </div>
        {sesion.listaInscritos.length === 0 ? (
          <p className="m-0 text-[10px] text-text-muted">Aún no hay estudiantes inscritos.</p>
        ) : (
          <TablaInscritos inscritos={sesion.listaInscritos} />
        )}
      </div>
    </article>
  );
};

export const MisSesionesGrupales = () => {
  const { fijarUsuario } = useAuth();
  const [intento, setIntento] = useState(0);
  const [terminado, setTerminado] = useState(null);
  const [pestana, setPestana] = useState("proximas");
  const cargando = terminado?.intento !== intento;
  const sesiones = cargando ? null : terminado?.sesiones;
  const error = cargando ? null : terminado?.error;

  useEffect(() => {
    const controlador = new AbortController();
    obtenerMisSesiones({ signal: controlador.signal })
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

  const proximas = sesiones?.filter((sesion) => !sesion.pasada) ?? [];
  const pasadas = sesiones?.filter((sesion) => sesion.pasada) ?? [];
  const visibles = pestana === "proximas" ? proximas : pestana === "pasadas" ? pasadas : sesiones ?? [];

  return (
    <>
      <section className="mb-[21px] flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-primary">
            Mi espacio de tutor
          </span>
          <h1 className="mb-[7px] mt-[9px] font-heading text-[24px] tracking-[-0.8px] text-text max-[650px]:text-[22px]">
            Mis sesiones grupales
          </h1>
          <p className="m-0 max-w-[540px] text-[11px] leading-[1.7] text-text-muted">
            Consulta tus sesiones publicadas y quiénes se inscribieron a cada una.
          </p>
        </div>
        <Link to="/dashboard/sesiones-grupales" className={claseBotonAcento}>
          ＋ Nueva sesión grupal
        </Link>
      </section>

      {cargando && (
        <section className="rounded-card border border-[#eeeaf5] bg-white shadow-card">
          <EstadoCarga texto="Cargando tus sesiones…" />
        </section>
      )}

      {error && (
        <section className="rounded-card border border-[#eeeaf5] bg-white shadow-card">
          <EstadoVacio
            icono="!"
            titulo="No pudimos cargar tus sesiones"
            texto="Ocurrió un problema al consultar tus sesiones grupales. Inténtalo de nuevo."
          >
            <button type="button" onClick={() => setIntento((n) => n + 1)} className={claseBotonSecundario}>
              Reintentar
            </button>
          </EstadoVacio>
        </section>
      )}

      {sesiones && (
        <>
          <div className="mb-[21px] grid grid-cols-4 gap-[17px] max-[1200px]:grid-cols-2 max-[650px]:gap-[11px]">
            <Estadistica etiqueta="Próximas" valor={proximas.length} pie="Sesiones por realizar" icono="▣" color="bg-icon-lilac text-icon-lilac-ink" />
            <Estadistica
              etiqueta="Estudiantes inscritos"
              valor={proximas.reduce((total, sesion) => total + sesion.inscritos, 0)}
              pie="En tus próximas sesiones"
              icono="♙"
              color="bg-icon-green text-icon-green-ink"
            />
            <Estadistica
              etiqueta="Llenas"
              valor={proximas.filter((sesion) => sesion.estado === "llena").length}
              pie="Sin cupos disponibles"
              icono="✓"
              color="bg-icon-amber text-icon-amber-ink"
            />
            <Estadistica etiqueta="Realizadas" valor={pasadas.length} pie="Sesiones pasadas" icono="◷" color="bg-icon-pink text-icon-pink-ink" />
          </div>

          <div
            role="tablist"
            aria-label="Filtrar sesiones"
            className="mb-[17px] flex w-max max-w-full items-center gap-[5px] overflow-auto rounded-[10px] bg-[#f5f2fa] p-[5px]"
          >
            {PESTANAS.map((opcion) => (
              <button
                key={opcion.clave}
                type="button"
                role="tab"
                aria-selected={pestana === opcion.clave}
                onClick={() => setPestana(opcion.clave)}
                className={`whitespace-nowrap rounded-[7px] border-0 px-3 py-2 text-[10px] font-bold transition ${
                  pestana === opcion.clave
                    ? "bg-white text-primary-dark shadow-[0_2px_5px_rgba(50,16,92,0.04)]"
                    : "bg-transparent text-[#8b829d] hover:text-primary"
                }`}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>

          {visibles.length === 0 ? (
            <section className="rounded-card border border-[#eeeaf5] bg-white shadow-card">
              <EstadoVacio
                icono="♧"
                titulo={sesiones.length === 0 ? "Tu próxima sesión empieza aquí" : "No hay sesiones en esta vista"}
                texto={
                  sesiones.length === 0
                    ? "Publica una sesión grupal y aquí verás quiénes se inscriben."
                    : "Cambia de pestaña para ver el resto de tus sesiones."
                }
              >
                {sesiones.length === 0 && (
                  <Link to="/dashboard/sesiones-grupales" className={claseBotonAcento}>
                    Crear sesión grupal
                  </Link>
                )}
              </EstadoVacio>
            </section>
          ) : (
            <div className="grid gap-[17px]">
              {visibles.map((sesion) => (
                <TarjetaSesion key={sesion.id} sesion={sesion} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
};
