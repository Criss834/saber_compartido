# Tasks · 011 Crear sesión grupal

## Backend

### Esquema
- [x] Comprobar que `sesiones_grupales` está vacía, crear el script que añade `duracion_minutos SMALLINT UNSIGNED NOT NULL DEFAULT 90` después de `fecha_hora_sesion`, ejecutarlo en Docker y regenerar con `prisma db pull` y `prisma generate`, renombrando el campo a `duracionMinutos` con `@map`. (`database/008_sesion_grupal_duracion.sql`, `backend/prisma/schema.prisma`) — 0 filas; script ejecutado en el MySQL de Docker; `db pull` solo añadió la línea nueva y se renombró a `duracionMinutos`.
- [x] Crear las constantes: duraciones (60, 90, 120), cupo (2 a 30), horas de inicio (07:00 a 20:00 cada 30 minutos), fin máximo (21:00), longitudes de título (5 a 150) y descripción (1000) y estados vivos (`abierta`, `llena`). (`backend/src/modules/tutorias-grupales/tutorias-grupales.constantes.js`)
- [x] Crear el esquema Zod de creación: `{titulo, materiaId, fecha, horaInicio, duracionMinutos, cupo, descripcion?}`, con los textos recortados y la descripción vacía tratada como ausente. (`backend/src/modules/tutorias-grupales/tutorias-grupales.schema.js`)

### Crear sesión
- [x] Crear en el repository: materias aprobadas del tutor; sesiones vivas, solicitudes vivas (como tutor y como estudiante) y bloques activos del tutor en un día; bloqueo de la fila del tutor con `SELECT … FOR UPDATE`, e inserción de la sesión. (`backend/src/modules/tutorias-grupales/tutorias-grupales.repository.js`)
- [x] Crear `crearSesion(tutorId, datos)`: la materia aprobada (400 `MATERIA_NO_OFRECIDA`); el horario futuro, dentro de la ventana, con hora de inicio permitida y fin hasta las 21:00 (400 `HORARIO_INVALIDO`); y sin choques con sesiones vivas, tutorías individuales vivas ni bloques activos (409 `CHOQUE_DE_HORARIO` con un mensaje que dice con qué choca y, si son bloques, que se quiten primero en "Mi disponibilidad"). Todo en una transacción. Guarda `fecha_hora_sesion` en hora de Colombia con la convención UTC y deja la sesión `abierta`. (`backend/src/modules/tutorias-grupales/tutorias-grupales.service.js`) — prueba de humo en proceso: válida → `abierta`; cruce con otra sesión, con un bloque publicado y con una tutoría aceptada → 409 con el detalle ("Se cruza con tu sesión grupal \"Repaso de SQL\" (2:30 p. m. a 4:00 p. m.)"); una sesión que empieza justo cuando termina otra, o termina justo cuando empieza otra, no choca; materia no aprobada, fecha pasada, fuera de la ventana y fin después de las 21:00 → 400. Los intervalos están en `tutorias-grupales/intervalos.js`, que reutiliza la 009.

### Consultas
- [x] Crear `listarMisSesiones(tutorId)`: las sesiones del tutor con materia, fecha, horas de inicio y fin, duración, cupo, inscritos (inscripciones `confirmada`), disponibles, estado y `pasada`; primero las próximas y después las pasadas. (`backend/src/modules/tutorias-grupales/tutorias-grupales.service.js`, `backend/src/modules/tutorias-grupales/tutorias-grupales.repository.js`)
- [x] Crear `listarSesionesPublicas(usuarioId)`: sesiones `abierta` y futuras de tutores visibles (regla de 008), sin las del usuario, con `tutor {id, nombreCompleto}` y los mismos campos, sin correos ni inscritos, ordenadas por fecha. (`backend/src/modules/tutorias-grupales/tutorias-grupales.service.js`, `backend/src/modules/tutorias-grupales/tutorias-grupales.repository.js`)

### Rutas
- [x] Crear el controller y las rutas: `POST /api/sesiones-grupales`, `GET /api/sesiones-grupales/mias` y `GET /api/sesiones-grupales/materias` con `requerirRol("tutor")`; `GET /api/sesiones-grupales` con `requerirRol("estudiante", "tutor")`; todas con `requerir-sesion` y validadas con Zod. Montarlas en la app. (`backend/src/modules/tutorias-grupales/tutorias-grupales.controller.js`, `backend/src/modules/tutorias-grupales/tutorias-grupales.routes.js`, `backend/src/app.js`)

### Ajustes en disponibilidad (009)
- [x] "Mi disponibilidad" marca como `sesion_grupal` las horas que se cruzan con una sesión viva del tutor; guardar un bloque en esas horas responde 400 `BLOQUE_INVALIDO`; el calendario público excluye los bloques que se cruzan. (`backend/src/modules/disponibilidad/disponibilidad.service.js`, `backend/src/modules/tutorias-grupales/tutorias-grupales.repository.js`) — comprobado: las horas 13:00–16:00 de una sesión de 1:30 a 4:00 p. m. salen como `sesion_grupal`, y marcar las 15:00 → 400 "…se cruza con tu sesión grupal…".
- [x] Confirmar que ninguna respuesta ni log expone correos, cédulas ni inscritos. (`backend/src/modules/tutorias-grupales/`) — las públicas solo traen `tutor {id, nombreCompleto}` y el número de inscritos; el módulo no escribe logs.

## Frontend

- [ ] Leer en el prototipo `Saber-Compartido-Dashboard` `groupCreateView` (formulario, "Antes de publicar", "Mis sesiones publicadas") y `groupsView` (tarjetas, badge de cupos, barra de ocupación, "Inscribirme"), y anotar la estructura, los textos y los colores, mapeándolos a los tokens de `index.css`. (`~/Escritorio/Saber-Compartido-Dashboard/`)
- [ ] Crear el cliente HTTP (crear, mías, públicas y materias, con manejo del 401 y de los errores `{codigo, mensaje}`) y las constantes (duraciones, cupo, horas de inicio y etiquetas y tonos de estado). (`frontend/src/features/tutorias-grupales/api-tutorias-grupales.js`, `frontend/src/features/tutorias-grupales/constantes.js`)
- [ ] Crear el formulario "Nueva sesión grupal": nombre, materia (preelegida si solo hay una), fecha con `min` y `max`, hora y duración en selects, cupo (8 por defecto), descripción con contador; validación en el cliente con errores por campo; "Limpiar" y "Publicar sesión" con estado de envío; errores del servidor en un aviso; al publicar, limpia el formulario y avisa. (`frontend/src/features/tutorias-grupales/formulario-sesion-grupal.jsx`)
- [ ] Crear la pantalla "Sesiones grupales" del tutor con el formulario, el panel "Antes de publicar" y "Mis sesiones publicadas" (fecha, horas, cupos "N / M", badge de estado, carga, error y vacío); ruta dentro de `RutaPorRol(["tutor"])` y entrada en "Mi espacio de tutor". (`frontend/src/pages/Dashboard/SesionesGrupales.jsx`, `frontend/src/features/dashboard/navegacion.js`, `frontend/src/features/dashboard/sidebar.jsx`, `frontend/src/App.jsx`)
- [ ] Crear la tarjeta de sesión grupal y la pantalla "Tutorías grupales": rejilla de 2 columnas (1 en móvil), tutor con enlace a su perfil, fecha y duración, barra de ocupación, descripción e "Inscribirme" deshabilitado con "Próximamente"; carga, error con "Reintentar" y vacío. La entrada deja de ser un placeholder. (`frontend/src/features/tutorias-grupales/tarjeta-sesion-grupal.jsx`, `frontend/src/pages/Dashboard/TutoriasGrupales.jsx`, `frontend/src/features/dashboard/navegacion.js`, `frontend/src/App.jsx`)
- [ ] Ajustar el calendario de 009: estado "Sesión grupal" con su color y su leyenda, no editable y no enviado al guardar. (`frontend/src/features/disponibilidad/calendario-semanal.jsx`, `frontend/src/pages/Dashboard/MiDisponibilidad.jsx`)
- [ ] Verificar el diseño en móvil y en escritorio. (`frontend/src/pages/Dashboard/`)

## Pruebas / validación

- [ ] Lint del backend: `npx oxlint src`. (`backend/`)
- [ ] Lint del frontend: `npm run lint`. (`frontend/`)
- [ ] Preparar datos de prueba desechables `prueba011.*`: un tutor con dos materias, otro tutor, un estudiante y una cuenta sin materias aprobadas, más un script de limpieza. (`database/`)
- [ ] Con curl (`127.0.0.1:3000`): sin sesión, 401; el administrador, 403 en todas las rutas; un estudiante, 403 en las rutas de tutor. (`backend/`)
- [ ] Con curl: crear una sesión válida (queda `abierta` con el tutor de la sesión, la fecha y hora en hora de Colombia, la duración y el cupo), y comprobar que aparece en "mías" (0 / cupo) y en las públicas para un estudiante, pero no para el propio tutor. (`backend/`)
- [ ] Con curl: materia no ofrecida → 400; fecha pasada, fuera de la ventana, hora no permitida o fin después de las 21:00 → 400 `HORARIO_INVALIDO`; cuerpo inválido (cupo 1 o 31, duración 45, título corto, descripción larga) → 400 de Zod. (`backend/`)
- [ ] Con curl: choques → 409 `CHOQUE_DE_HORARIO` contra otra sesión viva, una tutoría individual `pendiente` y una `aceptada` (como tutor y como estudiante) y un bloque de disponibilidad; una sesión que termina justo cuando empieza otra no choca. (`backend/`)
- [ ] Con curl: en "Mi disponibilidad" las horas de la sesión salen como `sesion_grupal`, guardarlas → 400 `BLOQUE_INVALIDO`, y las baterías de 009 y 010 siguen pasando. (`backend/`)
- [ ] Con curl: una sesión con la hora de inicio pasada deja de aparecer en las públicas y sale como `pasada` en "mías". (`backend/`)
- [ ] Revisar las respuestas: sin correos, cédulas ni inscritos. (`backend/`)
- [ ] En el navegador: el tutor publica (validaciones, choques, éxito y lista), el estudiante ve la tarjeta en "Tutorías grupales", "Mi disponibilidad" muestra las horas de la sesión, y la vista en móvil y en escritorio frente al prototipo. (`frontend/`)
- [ ] Regresión: búsqueda y perfil (008), disponibilidad (009), solicitudes (010), Resumen, login, Google y logout. (`frontend/`, `backend/`)

## Cierre

- [ ] Borrar los datos de prueba `prueba011.*` con el script de limpieza. (`database/`)
- [ ] Revisar el diff completo y confirmar que no hay `console.log`, secretos ni datos de prueba. (`./`)
- [ ] Confirmar que `package.json` y el lock no cambian. (`backend/package.json`, `frontend/package.json`)

## Mantenimiento

- [ ] Mover 011 a "Hecho" en el roadmap y dejar como siguiente la inscripción a sesión grupal (012, GRU-INS-001). (`constitution/roadmap.md`)
- [ ] Documentar en `tech-stack.md` el módulo `tutorias-grupales`, sus endpoints, el script 008, la duración, la regla de "una sola agenda por tutor" y el estado `sesion_grupal` de "Mi disponibilidad". (`constitution/tech-stack.md`)
- [ ] Ejecutar `database/008_sesion_grupal_duracion.sql` en Aiven al desplegar. (`database/`)
- [ ] Anotar en el backlog: editar y cancelar sesiones, marcarlas como completadas, sesiones recurrentes, modalidad y lugar, filtros en "Tutorías grupales" y las estadísticas del prototipo. (`constitution/roadmap.md`)
