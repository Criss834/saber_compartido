// Cliente de /api/solicitudes. Sigue el patrón de api-disponibilidad.js:
// credenciales del mismo origen y un error con { codigo, detalle, status } para
// que la pantalla decida (un 401 cierra la sesión en el cliente).

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

const conEstado = (ruta, estado) =>
  estado ? `${ruta}?estado=${encodeURIComponent(estado)}` : ruta;

// `datos`: { disponibilidadId, materiaId, metodoPago, mensaje? }
export const crearSolicitud = (datos) =>
  pedir("/api/solicitudes", "No pudimos enviar la solicitud", {
    method: "POST",
    cuerpo: datos,
  });

export const obtenerEnviadas = (estado, { signal } = {}) =>
  pedir(conEstado("/api/solicitudes/enviadas", estado), "No pudimos cargar tus tutorías", {
    signal,
  });

export const obtenerRecibidas = (estado, { signal } = {}) =>
  pedir(
    conEstado("/api/solicitudes/recibidas", estado),
    "No pudimos cargar las solicitudes recibidas",
    { signal },
  );

export const obtenerPendientesRecibidas = ({ signal } = {}) =>
  pedir("/api/solicitudes/recibidas/pendientes", "No pudimos contar las solicitudes", {
    signal,
  });

export const aceptarSolicitud = (id) =>
  pedir(`/api/solicitudes/${encodeURIComponent(id)}/aceptar`, "No pudimos aceptar la solicitud", {
    method: "POST",
  });

export const rechazarSolicitud = (id, motivo) =>
  pedir(
    `/api/solicitudes/${encodeURIComponent(id)}/rechazar`,
    "No pudimos rechazar la solicitud",
    { method: "POST", cuerpo: { motivo } },
  );

export const esCancelacion = (error) => error?.name === "AbortError";

// Avisa al contador del sidebar de que las solicitudes recibidas cambiaron.
export const EVENTO_SOLICITUDES = "solicitudes:cambio";
export const avisarCambioSolicitudes = () =>
  window.dispatchEvent(new Event(EVENTO_SOLICITUDES));
