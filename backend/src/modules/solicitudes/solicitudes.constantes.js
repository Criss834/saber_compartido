// Método de pago preferido del estudiante. La plataforma solo registra la
// preferencia; no procesa pagos (mission.md). Coincide con el ENUM de
// `solicitudes_tutoria.metodo_pago` (database/007_solicitud_tutoria.sql).
export const METODOS_PAGO = {
  efectivo: "Efectivo",
  transferencia: "Transferencia bancaria",
  nequi: "Nequi",
  daviplata: "Daviplata",
};

export const CLAVES_METODO_PAGO = Object.keys(METODOS_PAGO);

// Una solicitud en estos estados está "viva": retiene (pendiente) o bloquea
// (aceptada) el horario. Un bloque solo puede tener una solicitud viva.
export const ESTADOS_VIVOS = ["pendiente", "aceptada"];

// Estados que se pueden filtrar en las listas.
export const ESTADOS_FILTRABLES = ["pendiente", "aceptada", "rechazada"];

export const MAX_MENSAJE = 500;
export const MAX_MOTIVO = 300;
