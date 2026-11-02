-- ==============================================================================
-- Script de migración / actualización para Workbench
-- Feature: 011-crear-sesion-grupal
-- Cambios en `sesiones_grupales`:
--   1. `modalidad`: medio de la reunión que elige el tutor al publicar la sesión
--      y que el estudiante ve en la tarjeta: Google Meet, Microsoft Teams o
--      presencial. Solo se guarda el medio; el enlace o el lugar exacto quedan
--      fuera de alcance.
--
-- El DEFAULT 'presencial' solo cubre las filas que existieran antes (datos de
-- prueba); el service siempre envía la modalidad elegida.
--
-- MySQL 8 no admite ADD COLUMN IF NOT EXISTS: el script se ejecuta una sola vez,
-- después de `008_sesion_grupal_duracion.sql` y antes de
-- `010_notificaciones_leidas.sql` (feature 013).
-- ==============================================================================

ALTER TABLE sesiones_grupales
  ADD COLUMN modalidad ENUM('meet', 'teams', 'presencial') NOT NULL DEFAULT 'presencial' AFTER duracion_minutos;
