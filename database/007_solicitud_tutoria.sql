-- ==============================================================================
-- Script de migración / actualización para Workbench
-- Feature: 010-solicitud-tutoria
-- Cambios en `solicitudes_tutoria`:
--   1. `metodo_pago`: método de pago preferido del estudiante (SOL-TUT-001). La
--      plataforma solo registra la preferencia; no procesa pagos (mission.md).
--   2. `motivo_rechazo`: motivo opcional que el tutor indica al rechazar.
--   3. `respondido_en`: cuándo el tutor aceptó o rechazó la solicitud.
--   4. Índice (disponibilidad_id, estado) para encontrar la solicitud viva
--      (`pendiente` o `aceptada`) de un bloque. La regla "una sola solicitud
--      viva por bloque" se hace cumplir en el service con SELECT ... FOR UPDATE,
--      porque `disponibilidad_id` no es UNIQUE (un bloque rechazado se reutiliza).
--
-- Precondición: `solicitudes_tutoria` vacía (verificado antes de crear este
-- script). Si tuviera filas, `metodo_pago NOT NULL` fallaría: habría que
-- añadir la columna como NULL, rellenarla y después pasarla a NOT NULL.
--
-- MySQL 8 no admite ADD COLUMN IF NOT EXISTS: el script se ejecuta una sola vez.
-- ==============================================================================

ALTER TABLE solicitudes_tutoria
  ADD COLUMN metodo_pago ENUM('efectivo', 'transferencia', 'nequi', 'daviplata') NOT NULL AFTER mensaje,
  ADD COLUMN motivo_rechazo VARCHAR(300) NULL DEFAULT NULL AFTER estado,
  ADD COLUMN respondido_en TIMESTAMP NULL DEFAULT NULL AFTER motivo_rechazo,
  ADD INDEX idx_st_disponibilidad_estado (disponibilidad_id, estado);
