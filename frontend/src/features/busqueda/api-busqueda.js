// Cliente de /api/busqueda. Sigue el patrón de api-resumen.js: credenciales del
// mismo origen y un error con { codigo, detalle, status } para que la pantalla
// decida (un 401 cierra la sesión en el cliente). Cada función acepta un
// `signal` de AbortController para cancelar la petición anterior.

const pedir = async (url, mensajePorDefecto, signal) => {
  const respuesta = await fetch(url, { credentials: "same-origin", signal });
  const cuerpo = await respuesta.json().catch(() => null);

  if (respuesta.ok) return cuerpo;

  throw Object.assign(new Error(cuerpo?.mensaje ?? mensajePorDefecto), {
    codigo: cuerpo?.codigo,
    detalle: cuerpo?.detalle,
    status: respuesta.status,
  });
};

// Solo se envían los parámetros con valor, para que la URL quede limpia.
export const construirConsulta = ({ q, materiaId, filtro }) => {
  const parametros = new URLSearchParams();
  if (q?.trim()) parametros.set("q", q.trim());
  if (materiaId) parametros.set("materiaId", String(materiaId));
  if (filtro && filtro !== "todos") parametros.set("filtro", filtro);
  return parametros.toString();
};

export const buscarTutores = (busqueda, { signal } = {}) => {
  const consulta = construirConsulta(busqueda);
  return pedir(
    `/api/busqueda/tutores${consulta ? `?${consulta}` : ""}`,
    "No pudimos cargar los tutores",
    signal,
  );
};

export const obtenerMateriasConTutores = ({ signal } = {}) =>
  pedir("/api/busqueda/materias", "No pudimos cargar las materias", signal);

export const obtenerPerfilTutor = (id, { signal } = {}) =>
  pedir(
    `/api/busqueda/tutores/${encodeURIComponent(id)}`,
    "No pudimos cargar el perfil del tutor",
    signal,
  );

export const esCancelacion = (error) => error?.name === "AbortError";
