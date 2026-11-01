-- ==============================================================================
-- Script de carga para Workbench
-- Feature: 007-verificacion-tutor
-- Cambios:
--   Carga el catálogo de materias con las 7 materias del certificado de prueba
--   (sin Inglés, ver "Fuera de alcance" del spec). La tabla `materias` ya
--   existe desde `001_schema_inicial.sql` con "Cálculo diferencial"; este
--   script solo añade las que faltan.
--
--   Se usa INSERT IGNORE porque `materias.nombre` es UNIQUE y la colación
--   `utf8mb4_unicode_ci` ignora tildes y mayúsculas, así que el script puede
--   ejecutarse varias veces sin duplicar filas ni fallar.
-- ==============================================================================

INSERT IGNORE INTO materias (nombre) VALUES
  ('Estadística I'),
  ('Algorítmica y lógica de programación'),
  ('Álgebra y trigonometría'),
  ('Lógica para solución de problemas'),
  ('Lenguajes de programación'),
  ('Bases de datos'),
  ('Programación web (línea profundización)');
