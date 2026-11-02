import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../features/auth/auth-context.jsx";
import { Avatar } from "../../features/dashboard/avatar.jsx";
import { PROGRAMA_ACADEMICO } from "../../features/tutor/constantes.js";
import {
  esCancelacion,
  obtenerPerfilTutor,
} from "../../features/busqueda/api-busqueda.js";
import { Calificacion, MarcaVerificado } from "../../features/busqueda/tarjeta-tutor.jsx";
import { formatearNota } from "../../features/busqueda/formato.js";
import { DisponibilidadPublica } from "../../features/disponibilidad/disponibilidad-publica.jsx";
import { ModalSolicitar } from "../../features/solicitudes/modal-solicitar.jsx";

const MENSAJE_ENVIADA = "Solicitud enviada. Está pendiente de respuesta del tutor.";

const Panel = ({ titulo, children }) => (
  <section className="min-w-0 overflow-hidden rounded-card border border-[#eeeaf5] bg-white shadow-card">
    <div className="border-b border-[#f1edf6] px-5 py-[18px]">
      <h2 className="m-0 text-[13px] tracking-[-0.25px]">{titulo}</h2>
    </div>
    <div className="px-5 py-[18px]">{children}</div>
  </section>
);

const Dato = ({ etiqueta, children }) => (
  <div className="flex items-center justify-between gap-3 border-b border-[#f4f0f8] py-[11px] last:border-b-0">
    <span className="text-[10px] text-text-muted">{etiqueta}</span>
    <span className="text-right text-[11px] font-semibold text-text">
      {children}
    </span>
  </div>
);

const Cargando = () => (
  <div
    role="status"
    className="flex min-h-[45vh] flex-col items-center justify-center gap-4"
  >
    <span className="motion-safe:animate-spin h-7 w-7 rounded-full border-[3px] border-border border-t-primary" />
    <p className="text-text-muted">Cargando el perfil…</p>
  </div>
);

const claseBotonSecundario =
  "inline-flex min-h-[39px] items-center justify-center rounded-[10px] border border-border bg-white px-[15px] text-[11px] font-bold text-text transition hover:-translate-y-px";

export const PerfilTutor = () => {
  const { id } = useParams();
  const { state, hash } = useLocation();
  const navigate = useNavigate();
  const { fijarUsuario } = useAuth();

  // Solicitud de tutoría (010): bloque elegido en el calendario y versión del
  // calendario (cambia para recargarlo si el horario dejó de estar libre).
  const [bloqueElegido, setBloqueElegido] = useState(null);
  const [versionDisponibilidad, setVersionDisponibilidad] = useState(0);
  const [avisoHorario, setAvisoHorario] = useState(null);
  const volverA = `/dashboard/buscar-tutores${state?.busqueda ?? ""}`;

  const [intento, setIntento] = useState(0);
  const [terminado, setTerminado] = useState(null);
  const clave = `${id}:${intento}`;
  const cargando = terminado?.clave !== clave;
  const tutor = cargando ? null : terminado?.tutor;
  const error = cargando ? null : terminado?.error;

  useEffect(() => {
    const controlador = new AbortController();
    obtenerPerfilTutor(id, { signal: controlador.signal })
      .then((respuesta) => setTerminado({ clave, tutor: respuesta }))
      .catch((fallo) => {
        if (esCancelacion(fallo)) return;
        if (fallo?.status === 401) {
          fijarUsuario(null);
          return;
        }
        setTerminado({ clave, error: fallo });
      });
    return () => controlador.abort();
  }, [id, clave, fijarUsuario]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  // "Solicitar" desde la búsqueda llega con #disponibilidad: se baja al calendario
  // cuando el perfil termina de cargar.
  useEffect(() => {
    if (!cargando && !error && hash === "#disponibilidad") {
      document.getElementById("disponibilidad")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [cargando, error, hash]);

  const irADisponibilidad = (evento) => {
    evento.preventDefault();
    document.getElementById("disponibilidad")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const volver = (
    <Link to={volverA} className={`${claseBotonSecundario} mb-[17px]`}>
      ← Volver a tutores
    </Link>
  );

  if (cargando) {
    return (
      <>
        {volver}
        <Cargando />
      </>
    );
  }

  if (error) {
    // 404 (y un id con formato inválido, 400) se muestran igual: "no encontrado",
    // sin revelar si el tutor no existe, no está verificado o es el propio usuario.
    const noEncontrado = error.status === 404 || error.status === 400;
    return (
      <>
        {volver}
        <section className="rounded-card border border-[#eeeaf5] bg-white px-[15px] py-[35px] text-center shadow-card">
          <strong className="mb-[6px] block text-[12px] text-text">
            {noEncontrado
              ? "No encontramos este tutor"
              : "No pudimos cargar el perfil"}
          </strong>
          <p className="mx-auto mb-[14px] max-w-[290px] text-[10px] leading-[1.6] text-text-muted">
            {noEncontrado
              ? "Puede que el enlace no sea correcto o que el perfil ya no esté disponible."
              : "Ocurrió un problema al consultar el perfil. Inténtalo de nuevo."}
          </p>
          {!noEncontrado && (
            <button
              type="button"
              onClick={reintentar}
              className={claseBotonSecundario}
            >
              Reintentar
            </button>
          )}
        </section>
      </>
    );
  }

  const { calificacion, materias } = tutor;

  return (
    <>
      <section className="mb-[21px] flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-primary">
            Tu espacio académico
          </span>
          <h1 className="mb-[7px] mt-[9px] font-heading text-[24px] tracking-[-0.8px] text-text max-[650px]:text-[22px]">
            Perfil del tutor
          </h1>
          <p className="m-0 max-w-[540px] text-[11px] leading-[1.7] text-text-muted">
            Conoce su experiencia académica antes de pedirle una tutoría.
          </p>
        </div>
        {volver}
      </section>

      <section className="mb-[17px] flex flex-wrap items-center gap-[18px] rounded-card border border-[#eeeaf5] bg-white p-[22px] shadow-card max-[650px]:flex-col max-[650px]:items-start">
        <Avatar
          nombre={tutor.nombreCompleto}
          size="size-[72px]"
          redondeo="rounded-[20px]"
          className="text-[19px]"
        />
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success px-2.5 py-[5px] text-[9px] font-bold text-status-success-ink">
            ✓ Tutor verificado
          </span>
          <h2 className="mb-1 mt-2 flex flex-wrap items-center gap-2 text-[19px] tracking-[-0.5px] text-text">
            <span className="min-w-0 break-words">{tutor.nombreCompleto}</span>
            <MarcaVerificado />
          </h2>
          <p className="m-0 text-[11px] text-text-muted">{PROGRAMA_ACADEMICO}</p>

          <div className="mt-[14px] flex flex-wrap gap-x-[26px] gap-y-3">
            <div>
              <strong className="block text-[18px] tracking-[-0.5px] text-text">
                {calificacion.cantidad > 0
                  ? `★ ${Number(calificacion.promedio).toFixed(1)}`
                  : "—"}
              </strong>
              <small className="text-[10px] text-text-muted">
                {calificacion.cantidad > 0
                  ? `Calificación · ${calificacion.cantidad} ${
                      calificacion.cantidad === 1 ? "reseña" : "reseñas"
                    }`
                  : "Aún sin calificaciones"}
              </small>
            </div>
            <div>
              <strong className="block text-[18px] tracking-[-0.5px] text-text">
                {materias.length}
              </strong>
              <small className="text-[10px] text-text-muted">
                {materias.length === 1
                  ? "Materia verificada"
                  : "Materias verificadas"}
              </small>
            </div>
          </div>
        </div>
        <div className="max-[650px]:w-full">
          <a
            href="#disponibilidad"
            onClick={irADisponibilidad}
            className="inline-flex min-h-[39px] items-center justify-center rounded-[10px] bg-accent px-[15px] text-[11px] font-bold text-white shadow-[0_7px_15px_rgba(255,90,140,0.22)] transition hover:-translate-y-px max-[650px]:w-full"
          >
            Solicitar tutoría
          </a>
        </div>
      </section>

      <div className="grid grid-cols-2 items-start gap-[17px] max-[900px]:grid-cols-1">
        <Panel titulo="Información académica">
          <Dato etiqueta="Programa">{PROGRAMA_ACADEMICO}</Dato>
          <Dato etiqueta="Estado de verificación">
            <span className="rounded-full bg-status-success px-2 py-[4px] text-[9px] font-bold text-status-success-ink">
              Verificado
            </span>
          </Dato>
          {materias.map((materia) => (
            <Dato key={materia.id} etiqueta={materia.nombre}>
              {formatearNota(materia.promedio)}{" "}
              <span className="font-normal text-text-muted">/ 5.00</span>
            </Dato>
          ))}
          <p className="mb-0 mt-3 text-[9px] leading-[1.6] text-[#92899f]">
            Promedios académicos validados con el certificado de notas.
          </p>
        </Panel>

        <div className="grid min-w-0 gap-[17px]">
          <Panel titulo="Acerca de mí">
            <p className="m-0 text-[11px] leading-[1.8] text-text-muted">
              {tutor.descripcion ?? "Este tutor aún no ha escrito una descripción."}
            </p>
          </Panel>

          <Panel titulo="Calificaciones de estudiantes">
            <Calificacion calificacion={calificacion} />
            <p className="mb-0 mt-3 text-[9px] leading-[1.6] text-[#92899f]">
              La dan otros estudiantes al terminar una tutoría; no es la nota
              académica.
            </p>
          </Panel>
        </div>
      </div>

      <div id="disponibilidad" className="mt-[17px] scroll-mt-[90px]">
        <Panel titulo="Disponibilidad">
          <p className="mb-[14px] mt-0 text-[10px] leading-[1.6] text-text-muted">
            Elige un horario libre para solicitar una tutoría (hora de Colombia).
          </p>
          {avisoHorario && (
            <div
              role="alert"
              className="mb-[14px] rounded-[12px] border border-[#fde7b0] bg-status-pending px-4 py-3 text-[11px] font-semibold text-status-pending-ink"
            >
              {avisoHorario} Actualizamos el calendario con los horarios que siguen libres.
            </div>
          )}
          <DisponibilidadPublica
            tutorId={tutor.id}
            version={versionDisponibilidad}
            seleccionado={bloqueElegido?.id ?? null}
            onSeleccionar={(bloque) => {
              setAvisoHorario(null);
              setBloqueElegido(bloque);
            }}
          />
        </Panel>
      </div>

      {bloqueElegido && (
        <ModalSolicitar
          tutor={tutor}
          bloque={bloqueElegido}
          onCerrar={() => setBloqueElegido(null)}
          onEnviada={() =>
            navigate("/dashboard/mis-tutorias", { state: { aviso: MENSAJE_ENVIADA } })
          }
          onHorarioNoDisponible={(mensaje) => {
            setBloqueElegido(null);
            setAvisoHorario(`${mensaje}.`);
            setVersionDisponibilidad((n) => n + 1);
          }}
        />
      )}
    </>
  );
};
