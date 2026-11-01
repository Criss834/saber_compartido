const manejarFallos = async (respuesta, mensajePorDefecto) => {
  const cuerpo = await respuesta.json().catch(() => null);

  throw Object.assign(new Error(cuerpo?.mensaje ?? mensajePorDefecto), {
    codigo: cuerpo?.codigo,
    detalle: cuerpo?.detalle,
    status: respuesta.status,
  });
};

export const obtenerVerificaciones = async () => {
  const respuesta = await fetch("/api/admin/verificaciones", {
    credentials: "same-origin",
  });

  if (respuesta.ok) return respuesta.json().catch(() => []);

  await manejarFallos(respuesta, "No pudimos cargar las verificaciones");
};

export const obtenerVerificacion = async (id) => {
  const respuesta = await fetch(`/api/admin/verificaciones/${id}`, {
    credentials: "same-origin",
  });

  if (respuesta.ok) return respuesta.json();

  await manejarFallos(respuesta, "No pudimos cargar la solicitud");
};

export const urlCertificado = (id) =>
  `/api/admin/verificaciones/${id}/certificado`;

export const resolverVerificacion = async (id, decision) => {
  const respuesta = await fetch(`/api/admin/verificaciones/${id}/resolver`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });

  if (respuesta.ok) return respuesta.json().catch(() => ({}));

  await manejarFallos(respuesta, "No pudimos registrar la decisión");
};

export const reprocesarVerificacion = async (id) => {
  const respuesta = await fetch(
    `/api/admin/verificaciones/${id}/reprocesar`,
    {
      method: "POST",
      credentials: "same-origin",
    },
  );

  if (respuesta.ok) return respuesta.json().catch(() => ({}));

  await manejarFallos(respuesta, "No pudimos reprocesar el certificado");
};
