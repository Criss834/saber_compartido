// Catálogo fijo de métodos de pago (coincide con el ENUM de la BD). La plataforma
// solo registra la preferencia; no procesa pagos.
export const METODOS_PAGO = [
  { clave: "efectivo", etiqueta: "Efectivo" },
  { clave: "transferencia", etiqueta: "Transferencia bancaria" },
  { clave: "nequi", etiqueta: "Nequi" },
  { clave: "daviplata", etiqueta: "Daviplata" },
];

export const MAX_MENSAJE = 500;
export const MAX_MOTIVO = 300;

export const AVISO_PAGO =
  "Saber Compartido solo registra tu método de pago preferido; no procesa pagos. El pago se acuerda directamente con el tutor.";

// Pestañas de las listas: `null` = todas.
export const PESTANAS = [
  { estado: null, etiqueta: "Todas" },
  { estado: "pendiente", etiqueta: "Pendiente" },
  { estado: "aceptada", etiqueta: "Aceptada" },
  { estado: "rechazada", etiqueta: "Rechazada" },
];

const BADGES = {
  pendiente: { etiqueta: "Pendiente", clase: "bg-status-pending text-status-pending-ink" },
  aceptada: { etiqueta: "Aceptada", clase: "bg-status-success text-status-success-ink" },
  rechazada: { etiqueta: "Rechazada", clase: "bg-status-danger text-status-danger-ink" },
  vencida: { etiqueta: "Vencida", clase: "bg-status-neutral text-status-neutral-ink" },
};

// Una pendiente cuyo horario ya pasó se muestra como "Vencida".
export const badgeDe = (solicitud) =>
  BADGES[solicitud.vencida ? "vencida" : solicitud.estado] ?? BADGES.pendiente;
