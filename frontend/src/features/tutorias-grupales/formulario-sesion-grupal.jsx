import { useState } from "react";
import { useAuth } from "../auth/auth-context.jsx";
import { sumarDias } from "../disponibilidad/formato.js";
import { claseBotonPrimario, claseBotonSecundario, claseCampo } from "../solicitudes/estilos.js";
import { Ruedita } from "../solicitudes/modal.jsx";
import { crearSesionGrupal } from "./api-tutorias-grupales.js";
import {
  CUPO_MAXIMO,
  CUPO_MINIMO,
  CUPO_POR_DEFECTO,
  DESCRIPCION_MAXIMA,
  DIAS_VENTANA,
  DURACION_POR_DEFECTO,
  DURACIONES,
  HORAS_INICIO,
  MINUTOS_FIN_MAXIMO,
  MODALIDADES,
  TITULO_MAXIMO,
  TITULO_MINIMO,
  hoyEnColombia,
} from "./constantes.js";

// Formulario "Nueva sesión grupal" del prototipo (`groupCreateView`). Valida en
// el cliente lo mismo que el servidor; los choques de horario solo los conoce el
// servidor y se muestran en un aviso.

const vacio = (materias) => ({
  titulo: "",
  materiaId: materias.length === 1 ? String(materias[0].id) : "",
  fecha: "",
  horaInicio: "",
  duracionMinutos: String(DURACION_POR_DEFECTO),
  modalidad: "",
  cupo: String(CUPO_POR_DEFECTO),
  descripcion: "",
});

const validar = (valores, hoy) => {
  const errores = {};
  const titulo = valores.titulo.trim();
  if (titulo.length < TITULO_MINIMO || titulo.length > TITULO_MAXIMO) {
    errores.titulo = `El nombre debe tener entre ${TITULO_MINIMO} y ${TITULO_MAXIMO} caracteres.`;
  }
  if (!valores.materiaId) errores.materiaId = "Elige la materia de la sesión.";
  if (!valores.fecha) errores.fecha = "Elige la fecha de la sesión.";
  else if (valores.fecha < hoy || valores.fecha > sumarDias(hoy, DIAS_VENTANA)) {
    errores.fecha = "La fecha debe estar entre hoy y 4 semanas adelante.";
  }
  if (!valores.horaInicio) errores.horaInicio = "Elige la hora de inicio.";
  else {
    const inicio = HORAS_INICIO.find((hora) => hora.valor === valores.horaInicio)?.minutos ?? 0;
    if (inicio + Number(valores.duracionMinutos) > MINUTOS_FIN_MAXIMO) {
      errores.horaInicio = "Con esa duración la sesión terminaría después de las 9:00 p. m.";
    }
  }
  if (!valores.modalidad) errores.modalidad = "Elige el medio de la reunión.";
  const cupo = Number(valores.cupo);
  if (!Number.isInteger(cupo) || cupo < CUPO_MINIMO || cupo > CUPO_MAXIMO) {
    errores.cupo = `El cupo debe ser un número entre ${CUPO_MINIMO} y ${CUPO_MAXIMO}.`;
  }
  return errores;
};

const Campo = ({ id, etiqueta, error, ayuda, completo = false, children }) => (
  <div className={`flex min-w-0 flex-col gap-1.5 ${completo ? "col-span-2 max-[650px]:col-span-1" : ""}`}>
    <label htmlFor={id} className="text-[11px] font-semibold text-text">
      {etiqueta}
    </label>
    {children}
    {ayuda && <p className="m-0 text-[10px] text-text-muted">{ayuda}</p>}
    {error && (
      <p id={`${id}-error`} role="alert" className="m-0 text-[11px] text-danger">
        {error}
      </p>
    )}
  </div>
);

export const FormularioSesionGrupal = ({ materias, onPublicada }) => {
  const { fijarUsuario } = useAuth();
  const [valores, setValores] = useState(() => vacio(materias));
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const hoy = hoyEnColombia();

  const cambiar = (campo) => (evento) => {
    const valor = evento.target.value;
    setValores((previos) => ({ ...previos, [campo]: valor }));
    setErrores((previos) => {
      const siguientes = { ...previos };
      delete siguientes[campo];
      return siguientes;
    });
    setErrorServidor(null);
  };

  const propsCampo = (campo) => ({
    id: `sesion-${campo}`,
    value: valores[campo],
    onChange: cambiar(campo),
    "aria-invalid": Boolean(errores[campo]),
    "aria-describedby": errores[campo] ? `sesion-${campo}-error` : undefined,
    className: `${claseCampo} ${errores[campo] ? "border-danger" : ""}`,
  });

  const limpiar = () => {
    setValores(vacio(materias));
    setErrores({});
    setErrorServidor(null);
  };

  const publicar = async (evento) => {
    evento.preventDefault();
    if (enviando) return;
    const encontrados = validar(valores, hoy);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    setErrorServidor(null);
    try {
      const sesion = await crearSesionGrupal({
        titulo: valores.titulo.trim(),
        materiaId: Number(valores.materiaId),
        fecha: valores.fecha,
        horaInicio: valores.horaInicio,
        duracionMinutos: Number(valores.duracionMinutos),
        modalidad: valores.modalidad,
        cupo: Number(valores.cupo),
        descripcion: valores.descripcion.trim() || undefined,
      });
      setValores(vacio(materias));
      onPublicada(sesion);
    } catch (fallo) {
      if (fallo?.status === 401) {
        fijarUsuario(null);
        return;
      }
      const detalle = fallo?.detalle ? Object.values(fallo.detalle).flat()[0] : null;
      setErrorServidor(detalle ?? fallo.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={publicar} onReset={limpiar} noValidate>
      <div className="grid grid-cols-2 gap-4 max-[650px]:grid-cols-1">
        <Campo id="sesion-titulo" etiqueta="Nombre de la sesión *" error={errores.titulo} completo>
          <input
            type="text"
            maxLength={TITULO_MAXIMO}
            placeholder="Ej. Repaso de consultas SQL"
            {...propsCampo("titulo")}
          />
        </Campo>

        <Campo id="sesion-materiaId" etiqueta="Materia *" error={errores.materiaId} completo>
          <select {...propsCampo("materiaId")}>
            {materias.length > 1 && <option value="">Selecciona una materia</option>}
            {materias.map((materia) => (
              <option key={materia.id} value={materia.id}>
                {materia.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="sesion-fecha" etiqueta="Fecha *" error={errores.fecha}>
          <input type="date" min={hoy} max={sumarDias(hoy, DIAS_VENTANA)} {...propsCampo("fecha")} />
        </Campo>

        <Campo id="sesion-horaInicio" etiqueta="Hora de inicio *" error={errores.horaInicio}>
          <select {...propsCampo("horaInicio")}>
            <option value="">Selecciona</option>
            {HORAS_INICIO.map((hora) => (
              <option key={hora.valor} value={hora.valor}>
                {hora.etiqueta}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="sesion-duracionMinutos" etiqueta="Duración *" error={errores.duracionMinutos}>
          <select {...propsCampo("duracionMinutos")}>
            {DURACIONES.map((duracion) => (
              <option key={duracion.minutos} value={duracion.minutos}>
                {duracion.etiqueta}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="sesion-modalidad" etiqueta="Medio de la reunión *" error={errores.modalidad}>
          <select {...propsCampo("modalidad")}>
            <option value="">Selecciona</option>
            {MODALIDADES.map((modalidad) => (
              <option key={modalidad.clave} value={modalidad.clave}>
                {modalidad.etiqueta}
              </option>
            ))}
          </select>
        </Campo>

        <Campo
          id="sesion-cupo"
          etiqueta="Cupo máximo *"
          error={errores.cupo}
          ayuda={`Entre ${CUPO_MINIMO} y ${CUPO_MAXIMO} estudiantes.`}
        >
          <input type="number" min={CUPO_MINIMO} max={CUPO_MAXIMO} step={1} {...propsCampo("cupo")} />
        </Campo>

        <Campo id="sesion-descripcion" etiqueta="Descripción (opcional)" completo>
          <textarea
            rows={4}
            maxLength={DESCRIPCION_MAXIMA}
            placeholder="¿Qué temas van a trabajar en la sesión?"
            {...propsCampo("descripcion")}
            className={`${claseCampo} resize-y`}
          />
          <p className="m-0 text-right text-[10px] text-text-muted">
            {valores.descripcion.length}/{DESCRIPCION_MAXIMA}
          </p>
        </Campo>
      </div>

      <p className="mb-0 mt-3 text-[10px] text-text-muted">Hora de Colombia.</p>

      {errorServidor && (
        <div
          role="alert"
          className="mt-3 rounded-[12px] border border-[#ffd6da] bg-status-danger px-4 py-3 text-[11px] font-semibold text-status-danger-ink"
        >
          {errorServidor}
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="reset" disabled={enviando} className={claseBotonSecundario}>
          Limpiar
        </button>
        <button type="submit" disabled={enviando} className={`${claseBotonPrimario} bg-primary`}>
          {enviando && <Ruedita />}
          {enviando ? "Publicando…" : "Publicar sesión ↗"}
        </button>
      </div>
    </form>
  );
};
