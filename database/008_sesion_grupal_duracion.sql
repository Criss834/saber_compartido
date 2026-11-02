-- ==============================================================================
-- Script de migración / actualización para Workbench
-- Feature: 011-crear-sesion-grupal
-- Cambios en `sesiones_grupales`:
--   1. `duracion_minutos`: duración de la sesión (60, 90 o 120 minutos, según el
--      prototipo). Sin ella no se conoce la hora de fin ni se pueden detectar
--      choques con la agenda del tutor. Los valores permitidos se validan en el
--      service; la BD solo guarda el número.
--
-- La tabla estaba vacía al crear este script; el DEFAULT 90 cubre cualquier fila
-- que existiera antes.
--
-- MySQL 8 no admite ADD COLUMN IF NOT EXISTS: el script se ejecuta una sola vez.
-- Va antes que `009_notificaciones_leidas.sql` (feature 013).
-- ==============================================================================

ALTER TABLE sesiones_grupales
  ADD COLUMN duracion_minutos SMALLINT UNSIGNED NOT NULL DEFAULT 90 AFTER fecha_hora_sesion;
