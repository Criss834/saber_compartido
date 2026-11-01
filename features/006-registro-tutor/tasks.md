# Tasks · 006 Registro de tutor

## Backend

### Base de datos
- [x] Revisar el último script numerado de `database/` y elegir el siguiente número libre. (`database/005_registro_tutor.sql`)
- [x] Comprobar con `SHOW INDEX FROM tutores_materias;` si existe un `UNIQUE (tutor_id, materia_id)`. Si no existe, verificar con una consulta que no haya duplicados y crearlo en el script. Ya existía (`uq_tutor_materia` desde `001_schema_inicial.sql`); documentado en el script. (`database/005_registro_tutor.sql`)
- [x] Crear la tabla `archivos_certificado`: `id` INT UNSIGNED autoincremental, `usuario_id` INT UNSIGNED NOT NULL con FK a `usuarios`, `nombre_original` VARCHAR(255), `tipo_mime` VARCHAR(100), `tamano_bytes` INT UNSIGNED, `contenido` LONGBLOB NOT NULL, `subido_en` TIMESTAMP con default `CURRENT_TIMESTAMP`. (`database/005_registro_tutor.sql`)
- [x] Añadir `archivo_id` INT UNSIGNED NULL con FK a `archivos_certificado` en `documentos_verificacion`. (`database/005_registro_tutor.sql`)
- [x] Añadir `descripcion` VARCHAR(500) NULL a `tutores_materias`. (`database/005_registro_tutor.sql`)
- [x] Ejecutar el script en el MySQL de Docker y confirmar los cambios en Workbench. (`database/005_registro_tutor.sql`)
- [x] Regenerar el esquema con `prisma db pull` y el cliente con `prisma generate`; confirmar que el tipo `Bytes` aparece en `contenido`. (`backend/prisma/schema.prisma`)

### Catálogo de materias
- [x] Crear el repository con la consulta de todas las materias ordenadas por nombre. (`backend/src/modules/materias/materias.repository.js`)
- [x] Crear el service, que devuelve `{id, nombre}`. (`backend/src/modules/materias/materias.service.js`)
- [x] Crear el controller y las rutas con `GET /api/materias` protegido con `requerir-sesion`. (`backend/src/modules/materias/materias.controller.js`, `backend/src/modules/materias/materias.routes.js`)
- [x] Montar el router en la app. (`backend/src/app.js`)

### Registro de solicitudes
- [x] Instalar `multer` y dejar documentada la justificación de la dependencia en el plan. (`backend/package.json`)
- [x] Crear el esquema Zod: `materias` (1 a 5 elementos `{materiaId, promedio}`, sin `materiaId` repetido), `promedio` como texto (coma a punto, máximo 2 decimales, entre 4.00 y 5.00 sin pasar por `float`) y `descripcion` opcional de hasta 500 caracteres. (`backend/src/modules/tutores/tutores.schema.js`)
- [x] Crear el middleware de carga: multer en memoria, un archivo, 5 MB, traducción de sus errores al contrato `{codigo, mensaje}`, parseo del campo `materias` serializado como JSON y comprobación del tipo real por los primeros bytes (PDF, JPG, PNG). (`backend/src/shared/cargar-certificado.js`)
- [x] Crear el repository: buscar solicitudes del usuario para una lista de materias, crear el archivo, crear o reactivar cada solicitud, crear cada fila de `documentos_verificacion`, y listar las solicitudes del usuario sin cargar `contenido`. (`backend/src/modules/tutores/tutores.repository.js`)
- [x] Crear el service: verificar que las materias existan, rechazar el envío completo (con la lista de materias) si alguna está `pendiente` o `aprobado`, reactivar las `rechazado`, y ejecutar todo en una sola transacción de Prisma. Debe ignorar cualquier `usuarioId` del cuerpo y no tocar `usuarios.rol`. (`backend/src/modules/tutores/tutores.service.js`)
- [x] Definir los códigos de error (`SOLICITUD_DUPLICADA`, `MATERIA_INEXISTENTE`, `ARCHIVO_REQUERIDO`, `ARCHIVO_TIPO_INVALIDO`, `ARCHIVO_MUY_GRANDE`) y el formato de respuesta. (`backend/src/modules/tutores/tutores.service.js`)
- [x] Crear el controller: `POST /api/tutores/solicitudes` (201) y `GET /api/tutores/solicitudes`. (`backend/src/modules/tutores/tutores.controller.js`)
- [x] Crear las rutas, ambas con `requerir-sesion`, y el POST con el middleware de carga y `validar`. (`backend/src/modules/tutores/tutores.routes.js`)
- [x] Montar el router en la app. (`backend/src/app.js`)
- [x] Confirmar que ningún endpoint ni log devuelve `contenido` del archivo. (`backend/src/modules/tutores/`)

## Frontend

- [x] Leer la sección "Ser tutor" del prototipo `Saber-Compartido-Dashboard` y anotar estructura, textos, estados y colores, mapeándolos a los tokens de `index.css`. (`~/Escritorio/Saber-Compartido-Dashboard/`)
- [x] Crear la constante del programa académico fijo ("Tecnología en Desarrollo de Software"). (`frontend/src/features/tutor/constantes.js`)
- [x] Crear el cliente HTTP del catálogo siguiendo `api-resumen.js`. (`frontend/src/features/tutor/api-materias.js`)
- [x] Crear el cliente HTTP de solicitudes: `GET` y `POST` con `FormData` (sin fijar `Content-Type`, `materias` como JSON serializado), manejo del 401 y de `detalle` de Zod. (`frontend/src/features/tutor/api-tutor.js`)
- [x] Crear el formulario con: selección de 1 a 5 materias, un campo de promedio por cada materia elegida, programa académico en solo lectura, certificado, descripción opcional, aviso de revisión pendiente y botones "Limpiar" y "Enviar solicitud". (`frontend/src/features/tutor/formulario-registro-tutor.jsx`)
- [x] Añadir las validaciones en cliente (rango 4.00–5.00, máximo 2 decimales con coma o punto, tipo y 5 MB de archivo) y mostrar los errores del servidor junto a cada campo, conservando lo escrito si falla. (`frontend/src/features/tutor/formulario-registro-tutor.jsx`)
- [x] Crear el panel "Antes de postularte" (estático) y el panel "Estado de mi solicitud" con badges de estado, carga, error con "Reintentar" y vacío. (`frontend/src/features/tutor/panel-requisitos.jsx`, `frontend/src/features/tutor/panel-estado-solicitudes.jsx`)
- [x] Crear la pantalla que compone el formulario y los paneles, refresca la lista tras un envío exitoso, muestra la confirmación y, ante un 401, llama a `fijarUsuario(null)`. (`frontend/src/pages/Dashboard/SerTutor.jsx`)
- [x] Hacer que la entrada "Ser tutor" apunte a la ruta real y registrar la ruta dentro de `LayoutDashboard`. (`frontend/src/features/dashboard/navegacion.js`, `frontend/src/App.jsx`)
- [x] Verificar el diseño en móvil (una sola columna) y escritorio (dos columnas). (`frontend/src/pages/Dashboard/SerTutor.jsx`)

## Pruebas / validación

- [x] Lint del backend: `npx oxlint src`. (`backend/`)
- [x] Lint del frontend: `npm run lint`. (`frontend/`)
- [x] Con curl (`127.0.0.1:3000`): `POST` sin sesión devuelve 401; `GET /api/materias` con sesión devuelve la lista. (`backend/`)
- [x] Con curl: envío válido de 2 materias con un PDF devuelve 201 y crea 2 filas `pendiente` y 2 filas en `documentos_verificacion` con el mismo `archivo_id`. (`backend/`)
- [x] Con curl, casos de error: promedio 3.99, 5.01, 4.123 y "abc"; materia repetida; materia inexistente; sin archivo; archivo `.txt`; archivo de más de 5 MB; archivo con extensión `.pdf` pero contenido distinto. (`backend/`)
- [x] Con curl: reenviar una materia `pendiente` o `aprobado` devuelve `SOLICITUD_DUPLICADA` y no crea nada; si cualquier materia del envío falla, no se guarda ninguna. (`backend/`)
- [x] Marcar una solicitud como `rechazado` en la BD y reenviarla: pasa a `pendiente`, se limpian `revisado_por` y `revisado_en` y hay un segundo documento. (`database/`)
- [x] Comprobar que `usuarios.rol` sigue siendo `estudiante` tras registrarse. (`database/`)
- [x] Probar un archivo de 5 MB contra la BD y confirmar que no falla por `max_allowed_packet`. (`database/`)
- [x] En el navegador: envío completo con éxito, errores por campo, estados de carga, vacío y error de red con "Reintentar", sesión expirada (401) y comparación visual con el prototipo en móvil y escritorio. (`frontend/`)
- [x] Regresión: registro, login, Google y logout siguen funcionando, y el Resumen sigue cargando. (`frontend/`, `backend/`)

## Cierre

- [x] Revisar el diff completo y confirmar que no hay `console.log`, secretos ni archivos de prueba. (`./`)
- [x] Confirmar que `package.json` y el lock solo cambian por `multer`. (`backend/package.json`)
- [x] Hacer commit con un mensaje claro y `git push`. (`./`)

## Mantenimiento

- [ ] Mover 006 a "Hecho" en el roadmap y dejar TUT-VER-001 como siguiente. (`constitution/roadmap.md`)
- [ ] Documentar en `tech-stack.md` la dependencia `multer`, las tablas `archivos_certificado` y `documentos_verificacion`, y la convención de guardar los bytes en la BD con `url_archivo` como referencia. (`constitution/tech-stack.md`)
- [ ] Corregir en `tech-stack.md` que el linter es oxlint y no ESLint. (`constitution/tech-stack.md`)
- [ ] Anotar en el backlog los pendientes: semestre del tutor, programa académico editable cuando la BD gestione programas y reemplazo del certificado. (`constitution/roadmap.md`)