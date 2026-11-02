# Tasks · 012 Inscripción a sesión grupal

## Backend

- [x] Confirmar en la BD la estructura de `inscripciones_sesion_grupal` (estados y `UNIQUE (sesion_grupal_id, estudiante_id)`) y que no hace falta cambiar el esquema. Si hiciera falta, crear el siguiente script numerado (el último es `009_sesion_grupal_modalidad.sql`). (`database/`, `backend/prisma/schema.prisma`) — confirmado: `estado ENUM('confirmada','cancelada')`, `UNIQUE KEY uq_sesion_estudiante (sesion_grupal_id, estudiante_id)` y FKs con `ON DELETE CASCADE`; 0 filas. No hace falta cambiar el esquema.
- [x] Crear en el repository: bloqueo de la sesión con `SELECT … FOR UPDATE`, lectura de la sesión con su tutor, conteo de confirmadas, inscripción del estudiante en la sesión, inserción, paso a `llena`, sesiones a las que el usuario está inscrito en un día, inscripciones próximas del usuario e inscritos de una sesión (nombre y correo). (`backend/src/modules/tutorias-grupales/tutorias-grupales.repository.js`)
- [x] Crear `inscribirse(estudianteId, sesionId)` en una transacción: sesión existente, visible, no empezada y ni cancelada ni completada (409 `SESION_NO_DISPONIBLE`); no propia (409 `SESION_PROPIA`); no inscrito ya (409 `YA_INSCRITO`); no llena (409 `SESION_LLENA`); sin choques con sus sesiones inscritas, las que publicó ni sus tutorías individuales vivas (409 `CHOQUE_DE_HORARIO`). Inserta `confirmada` y pasa la sesión a `llena` al completar el cupo. (`backend/src/modules/tutorias-grupales/tutorias-grupales.service.js`) — prueba de humo en proceso: 3 inscripciones simultáneas a una sesión de cupo 2 → 2 confirmadas, la tercera 409 `SESION_LLENA` y la sesión en `llena`; inscribirse otra vez → `YA_INSCRITO`; el tutor a su sesión → `SESION_PROPIA`; sesión que se cruza con otra inscrita → `CHOQUE_DE_HORARIO` con el detalle; inexistente → `SESION_NO_DISPONIBLE`. Si existiera una inscripción `cancelada`, se reactiva en lugar de chocar con el `UNIQUE`.
- [x] Crear `listarMisInscripciones(usuarioId)` (próximas, por fecha, con materia, tutor, horario y modalidad) y `listarInscritos(tutorId, sesionId)` (404 `SESION_NO_ENCONTRADA` si no es suya). (`backend/src/modules/tutorias-grupales/tutorias-grupales.service.js`)
- [x] Incluir en `listarPublicas` las sesiones `llena` futuras y el campo `inscrito` del usuario en cada una. (`backend/src/modules/tutorias-grupales/tutorias-grupales.service.js`, `backend/src/modules/tutorias-grupales/tutorias-grupales.repository.js`)
- [x] Crear las rutas `POST /api/sesiones-grupales/:id/inscripcion` y `GET /api/sesiones-grupales/inscripciones` con `requerirRol("estudiante", "tutor")`, y `GET /api/sesiones-grupales/:id/inscritos` con `requerirRol("tutor")`, con el `id` validado con Zod. (`backend/src/modules/tutorias-grupales/tutorias-grupales.routes.js`, `backend/src/modules/tutorias-grupales/tutorias-grupales.controller.js`, `backend/src/modules/tutorias-grupales/tutorias-grupales.schema.js`)
- [x] Confirmar que el listado público no expone inscritos y que los correos solo llegan al tutor de la sesión. (`backend/src/modules/tutorias-grupales/`) — las públicas solo traen el número de inscritos y `inscrito` del propio usuario; los inscritos con correo solo los recibe el tutor de la sesión (otro tutor → 404 `SESION_NO_ENCONTRADA`).

## Frontend

- [ ] Añadir al cliente HTTP: inscribirse, mis inscripciones e inscritos de una sesión. (`frontend/src/features/tutorias-grupales/api-tutorias-grupales.js`)
- [ ] Tarjeta: botón "Inscribirme a la sesión" habilitado con estado de envío, "Ya estás inscrito" con badge "Inscrito" y "Sesión sin cupos" con badge "Cupos llenos". (`frontend/src/features/tutorias-grupales/tarjeta-sesion-grupal.jsx`)
- [ ] "Tutorías grupales": inscribirse con el aviso "Inscripción confirmada. Te esperamos en la sesión." y la recarga de la lista; ante un 409, el mensaje y la recarga; sección "Mis inscripciones" con su carga, error y vacío. (`frontend/src/pages/Dashboard/TutoriasGrupales.jsx`)
- [ ] "Mis sesiones publicadas" del tutor: "Ver inscritos" en cada fila, con la lista (nombre y correo), su carga y su vacío. (`frontend/src/pages/Dashboard/SesionesGrupales.jsx`)
- [ ] Verificar el diseño en móvil y en escritorio. (`frontend/src/pages/Dashboard/`)

## Pruebas / validación

- [ ] Lint del backend: `npx oxlint src`. (`backend/`)
- [ ] Lint del frontend: `npm run lint`. (`frontend/`)
- [ ] Preparar datos de prueba desechables `prueba012.*`: un tutor con sesiones (una de cupo 2), otro tutor y varios estudiantes, con las tutorías individuales para los choques insertadas en la BD, más un script de limpieza. (`database/`)
- [ ] Con curl (`127.0.0.1:3000`): sin sesión, 401; el administrador, 403; un estudiante, 403 en los inscritos. (`backend/`)
- [ ] Con curl: inscribirse a una sesión con cupos → 201 `confirmada`, `inscrito: true` y un cupo menos; aparece en "Mis inscripciones". (`backend/`)
- [ ] Con curl: inscribirse dos veces, a la propia sesión, a una inexistente o pasada y con choques → 409 con su código. (`backend/`)
- [ ] Con curl: al completar el cupo la sesión pasa a `llena`, sigue en la lista pública y una nueva inscripción → 409 `SESION_LLENA`. (`backend/`)
- [ ] Concurrencia: varias inscripciones simultáneas por los últimos cupos nunca superan el cupo. (`backend/`)
- [ ] Con curl: el tutor ve los inscritos de su sesión (nombre y correo) y otro tutor recibe 404; el listado público no expone inscritos. (`backend/`)
- [ ] La batería de la 011 sigue pasando. (`backend/`)
- [ ] En el navegador: inscribirse, el aviso, la tarjeta inscrita, la sesión llena con el botón deshabilitado, "Mis inscripciones", "Ver inscritos" del tutor y la vista en móvil y escritorio. (`frontend/`)

## Cierre

- [ ] Borrar los datos de prueba `prueba012.*` con el script de limpieza. (`database/`)
- [ ] Revisar el diff completo y confirmar que no hay `console.log`, secretos ni datos de prueba. (`./`)
- [ ] Confirmar que `package.json` y el lock no cambian. (`backend/package.json`, `frontend/package.json`)

## Mantenimiento

- [ ] Mover 011 y 012 a "Hecho" en el roadmap y dejar como siguiente el despliegue y después la 013. (`constitution/roadmap.md`)
- [ ] Documentar en `tech-stack.md` los endpoints de inscripción y la regla del cupo con `FOR UPDATE`. (`constitution/tech-stack.md`)
- [ ] Anotar en el backlog: cancelar inscripciones, lista de espera, correos de inscripción y el choque inverso con la 010. (`constitution/roadmap.md`)
