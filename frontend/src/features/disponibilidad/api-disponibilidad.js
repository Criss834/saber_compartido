// Cliente de /api/disponibilidad. Sigue el patrón de api-busqueda.js: credenciales
// del mismo origen y un error con { codigo, detalle, status } para que la pantalla
// decida (un 401 cierra la sesión en el cliente).

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

export const obtenerMiSemana = (semana, { signal } = {}) =>
  pedir(
    `/api/disponibilidad/mia${semana ? `?semana=${encodeURIComponent(semana)}` : ""}`,
    "No pudimos cargar tu disponibilidad",
    { signal },
  );

// `bloques`: lista completa de los bloques marcados de la semana ([{fecha, horaInicio}]).
export const guardarMiSemana = (semana, bloques) =>
  pedir("/api/disponibilidad/mia", "No pudimos guardar tu disponibilidad", {
    method: "PUT",
    cuerpo: { semana, bloques },
  });

export const obtenerDisponibilidadTutor = (id, { signal } = {}) =>
  pedir(
    `/api/disponibilidad/tutores/${encodeURIComponent(id)}`,
    "No pudimos cargar la disponibilidad del tutor",
    { signal },
  );

export const esCancelacion = (error) => error?.name === "AbortError";
