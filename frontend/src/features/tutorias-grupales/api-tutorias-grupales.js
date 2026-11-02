// Cliente de /api/sesiones-grupales. Mismo patrón que api-solicitudes.js:
// credenciales del mismo origen y un error con { codigo, detalle, status }.

const pedir = async (url, mensajePorDefecto, { signal, method = "GET", cuerpo } = {}) => {
  const respuesta = await fetch(url, {
    method,
    credentials: "same-origin",
    signal,
    headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await respuesta.json().catch(() => null);

  if (respuesta.ok) return datos;

  throw Object.assign(new Error(datos?.mensaje ?? mensajePorDefecto), {
    codigo: datos?.codigo,
    detalle: datos?.detalle,
    status: respuesta.status,
  });
};

// `datos`: { titulo, materiaId, fecha, horaInicio, duracionMinutos, cupo, descripcion? }
export const crearSesionGrupal = (datos) =>
  pedir("/api/sesiones-grupales", "No pudimos publicar la sesión", {
    method: "POST",
    cuerpo: datos,
  });

export const obtenerMisSesiones = ({ signal } = {}) =>
  pedir("/api/sesiones-grupales/mias", "No pudimos cargar tus sesiones", { signal });

export const obtenerMateriasParaSesion = ({ signal } = {}) =>
  pedir("/api/sesiones-grupales/materias", "No pudimos cargar tus materias", { signal });

export const obtenerSesionesPublicas = ({ signal } = {}) =>
  pedir("/api/sesiones-grupales", "No pudimos cargar las tutorías grupales", { signal });

export const esCancelacion = (error) => error?.name === "AbortError";
