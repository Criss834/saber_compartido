# Tasks · 010 Solicitud de tutoría personalizada

## Backend

### Esquema
- [x] Comprobar que `solicitudes_tutoria` está vacía y crear el script con `metodo_pago ENUM('efectivo','transferencia','nequi','daviplata') NOT NULL`, `motivo_rechazo VARCHAR(300) NULL`, `respondido_en TIMESTAMP NULL` y el índice `(disponibilidad_id, estado)`. Ejecutarlo en Docker y regenerar con `prisma db pull` y `prisma generate`. (`database/007_solicitud_tutoria.sql`, `backend/prisma/schema.prisma`) — tabla con 0 filas; script ejecutado en el MySQL de Docker. `db pull` dejó las columnas en snake_case y se renombraron a `metodoPago`, `motivoRechazo` y `respondidoEn` con `@map`, como el resto del esquema; enum `solicitudes_tutoria_metodo_pago`.
- [x] Crear las constantes: métodos de pago con su etiqueta ("Efectivo", "Transferencia bancaria", "Nequi", "Daviplata"), estados que retienen un bloque (`pendiente`, `aceptada`) y longitudes máximas (mensaje 500, motivo 300). (`backend/src/modules/solicitudes/solicitudes.constantes.js`)
- [x] Crear los esquemas Zod: crear `{disponibilidadId, materiaId, metodoPago, mensaje?}`, rechazar `{motivo?}` (ambos textos recortados y vacíos como ausentes), `?estado=` opcional e `id` entero positivo. (`backend/src/modules/solicitudes/solicitudes.schema.js`)

### Crear solicitud
- [x] Crear en el repository, dentro de una transacción: bloquear el bloque con `SELECT … FOR UPDATE`, leerlo con su tutor, buscar solicitudes vivas del bloque y del estudiante a la misma fecha y hora, comprobar que la materia está aprobada para el tutor e insertar la solicitud. (`backend/src/modules/solicitudes/solicitudes.repository.js`)
- [x] Crear `crearSolicitud(estudianteId, datos)`: valida el tutor visible y distinto del estudiante (404 `TUTOR_NO_ENCONTRADO`); el bloque activo, alineado, futuro y sin solicitud viva (409 `HORARIO_NO_DISPONIBLE`); la materia ofrecida (400 `MATERIA_NO_OFRECIDA`); y que no haya choque de horario del estudiante (409 `CHOQUE_DE_HORARIO`). Toma `tutorId` y `fechaHoraSolicitud` del bloque (hora de Colombia con la convención UTC de 009). Devuelve la solicitud creada. (`backend/src/modules/solicitudes/solicitudes.service.js`) — prueba de humo en proceso: dos solicitudes simultáneas al mismo bloque → una creada y la otra 409 `HORARIO_NO_DISPONIBLE` (el `FOR UPDATE` funciona con el adaptador MariaDB).

### Responder
- [x] Crear en el repository `responder(id, tutorId, datos)` con `updateMany` condicionado a `estado = 'pendiente'` y la consulta de la solicitud con su bloque para distinguir 404 de 409. (`backend/src/modules/solicitudes/solicitudes.repository.js`)
- [x] Crear `aceptarSolicitud(tutorId, id)`: solo del tutor (404 `SOLICITUD_NO_ENCONTRADA`), solo `pendiente` (409 `SOLICITUD_YA_RESPONDIDA`) y con horario futuro (409 `SOLICITUD_VENCIDA`). Guarda `respondido_en`. (`backend/src/modules/solicitudes/solicitudes.service.js`)
- [x] Crear `rechazarSolicitud(tutorId, id, motivo)` con las mismas reglas, salvo la del vencimiento (una vencida se puede rechazar), guardando `motivo_rechazo` y `respondido_en`. (`backend/src/modules/solicitudes/solicitudes.service.js`)

### Consultas
- [x] Crear `listarEnviadas(estudianteId, estado?)` y `listarRecibidas(tutorId, estado?)`: las pendientes primero y luego por fecha de la tutoría. Cada fila trae la contraparte (nombre, y correo solo si está `aceptada`), la materia, `fecha`, `horaInicio`, `horaFin`, el método de pago con su etiqueta, el mensaje, el motivo, el estado, `vencida` y `creadoEn`. (`backend/src/modules/solicitudes/solicitudes.service.js`, `backend/src/modules/solicitudes/solicitudes.repository.js`)
- [x] Crear `contarPendientesRecibidas(tutorId)`, sin contar las vencidas. (`backend/src/modules/solicitudes/solicitudes.service.js`)

### Notificaciones
- [x] Crear las plantillas y funciones `enviarCorreoNuevaSolicitud` (al tutor: estudiante, materia, día y hora, método de pago, mensaje y enlace a "Solicitudes recibidas"), `enviarCorreoSolicitudAceptada` (al estudiante: tutor, materia, horario, correo del tutor y enlace a "Mis tutorías") y `enviarCorreoSolicitudRechazada` (al estudiante: tutor, materia, horario y motivo), con `escaparHtml` y sin datos personales en el asunto. (`backend/src/shared/email/correo.service.js`) — plantilla compartida `plantillaSolicitud` con el estilo del correo de verificación. El formateo de día y hora (`describirBloque`, `horaLegible`, `fechaHoraABd`) pasó de `disponibilidad.service.js` a `disponibilidad/fechas.js` para reutilizarlo.
- [x] Lanzar cada correo después de confirmar la transacción, sin esperarlo, y registrar los fallos sin el correo ni el contenido. (`backend/src/modules/solicitudes/solicitudes.service.js`) — `notificar()` registra solo la acción, el id de la solicitud y el código de error, sin destinatarios. En la prueba de humo, `sendMail` se reemplazó por un registro para no enviar correos reales (el SMTP del `.env` está configurado).

### Rutas
- [x] Crear el controller y las rutas: `POST /api/solicitudes` y `GET /api/solicitudes/enviadas` con `requerirRol("estudiante", "tutor")`; `GET /api/solicitudes/recibidas`, `GET /api/solicitudes/recibidas/pendientes`, `POST /api/solicitudes/:id/aceptar` y `POST /api/solicitudes/:id/rechazar` con `requerirRol("tutor")`. Todas con `requerir-sesion` y validadas con Zod. (`backend/src/modules/solicitudes/solicitudes.controller.js`, `backend/src/modules/solicitudes/solicitudes.routes.js`)
- [x] Montar el router en la app como `/api/solicitudes`. (`backend/src/app.js`)

### Ajustes en disponibilidad (009)
- [x] El calendario público excluye los bloques con una solicitud `pendiente` y devuelve el `id` de cada bloque. (`backend/src/modules/disponibilidad/disponibilidad.repository.js`, `backend/src/modules/disponibilidad/disponibilidad.service.js`)
- [x] "Mi disponibilidad" devuelve el estado `pendiente` para los bloques retenidos, y guardar una semana que quita uno responde 409 `BLOQUE_CON_SOLICITUD_PENDIENTE` sin guardar nada. (`backend/src/modules/disponibilidad/disponibilidad.service.js`, `backend/src/modules/disponibilidad/disponibilidad.constantes.js`)
- [x] Confirmar que ninguna respuesta ni log expone cédulas, certificados, solicitudes ajenas ni correos fuera de las tutorías aceptadas. (`backend/src/modules/solicitudes/`) — las recibidas no traen ids de estudiantes; los correos (`correo`) solo aparecen en las `aceptada`; el motivo solo en las `rechazada`; los logs de correo solo llevan el id de la solicitud.

## Frontend

- [ ] Leer en el prototipo `Saber-Compartido-Dashboard` el modal "Solicitar una tutoría" (`requestTutor`), `sessionsView` / `sessionRow` ("Mis tutorías") y `tutorRequestsView` con su modal de rechazo, y anotar la estructura, los textos, los estados y los colores, mapeándolos a los tokens de `index.css`. (`~/Escritorio/Saber-Compartido-Dashboard/`)
- [ ] Crear el cliente HTTP (crear, enviadas, recibidas, contador, aceptar y rechazar) con el manejo de 401 y de los errores `{codigo, mensaje}`, y las constantes de métodos de pago y estados (etiqueta y tono del badge). (`frontend/src/features/solicitudes/api-solicitudes.js`, `frontend/src/features/solicitudes/constantes.js`)
- [ ] Ajustar el calendario de 009: estado "Con solicitud pendiente" en ámbar, no editable y con aviso en "Mi disponibilidad"; manejar el 409 `BLOQUE_CON_SOLICITUD_PENDIENTE`; y añadir un modo seleccionable en el calendario público. (`frontend/src/features/disponibilidad/calendario-semanal.jsx`, `frontend/src/features/disponibilidad/disponibilidad-publica.jsx`, `frontend/src/pages/Dashboard/MiDisponibilidad.jsx`)
- [ ] Crear el modal "Solicitar una tutoría": tutor y horario elegido, materia (preelegida si solo hay una), método de pago, mensaje opcional con contador, aviso de que no se procesan pagos, "Cancelar" y "Enviar solicitud" con estado de envío. Con `role="dialog"`, foco inicial y cierre con Escape. Ante `HORARIO_NO_DISPONIBLE` muestra el aviso y recarga el calendario; ante otros errores, el mensaje del servidor. (`frontend/src/features/solicitudes/modal-solicitar.jsx`)
- [ ] Habilitar "Solicitar tutoría" en el perfil (lleva a `#disponibilidad`) y "Solicitar" en la tarjeta de búsqueda (enlaza al perfil con ese ancla); conectar el calendario seleccionable con el modal y, al enviar, ir a "Mis tutorías" con el mensaje de éxito. (`frontend/src/pages/Dashboard/PerfilTutor.jsx`, `frontend/src/features/busqueda/tarjeta-tutor.jsx`)
- [ ] Crear "Mis tutorías": pestañas "Todas", "Pendiente", "Aceptada" y "Rechazada" en la URL; filas con recuadro de fecha, materia, tutor, horario, método de pago, badge, motivo si fue rechazada y correo del tutor si fue aceptada; estados de carga, error con "Reintentar" y vacío con "Buscar tutor"; mensaje de éxito al llegar desde el modal. La entrada deja de ser un placeholder. (`frontend/src/pages/Dashboard/MisTutorias.jsx`, `frontend/src/features/dashboard/navegacion.js`, `frontend/src/App.jsx`)
- [ ] Crear "Solicitudes recibidas": pestañas, tabla (tarjetas en móvil) con estudiante, materia, horario, método de pago, mensaje, estado y fecha de envío; "Aceptar" con carga por fila y mensaje de éxito; "Rechazar" con un modal y motivo opcional; vencidas sin botones; ante un 409, el mensaje y la recarga. Ruta dentro de `RutaPorRol(["tutor"])` y entrada en "Mi espacio de tutor". (`frontend/src/pages/Dashboard/SolicitudesRecibidas.jsx`, `frontend/src/features/solicitudes/modal-rechazar.jsx`, `frontend/src/features/dashboard/navegacion.js`, `frontend/src/App.jsx`)
- [ ] Mostrar el contador de pendientes en la entrada "Solicitudes recibidas" del sidebar, refrescado al cargar y después de aceptar o rechazar. (`frontend/src/features/solicitudes/use-pendientes-recibidas.js`, `frontend/src/features/dashboard/sidebar.jsx`)
- [ ] Verificar el diseño en móvil y en escritorio. (`frontend/src/pages/Dashboard/`)

## Pruebas / validación

- [ ] Lint del backend: `npx oxlint src`. (`backend/`)
- [ ] Lint del frontend: `npm run lint`. (`frontend/`)
- [ ] Preparar datos de prueba desechables `prueba010.*`: dos tutores con bloques (uno con dos materias y otro con una), dos estudiantes y una cuenta sin materias aprobadas, más un script de limpieza. (`database/`)
- [ ] Con curl (`127.0.0.1:3000`): sin sesión, 401; el administrador, 403 en todas las rutas; un estudiante, 403 en las rutas de tutor. (`backend/`)
- [ ] Con curl: crear una solicitud válida (queda `pendiente` con `tutorId`, fecha y hora del bloque y método de pago), y comprobar que el bloque desaparece del calendario público y aparece como `pendiente` en "Mi disponibilidad" del tutor. (`backend/`)
- [ ] Con curl: bloque ocupado, quitado o pasado → 409 `HORARIO_NO_DISPONIBLE`; uno mismo o un no tutor → 404; materia no ofrecida → 400; choque de horario → 409; cuerpo inválido → 400 de Zod. (`backend/`)
- [ ] Concurrencia: dos `POST` simultáneos al mismo bloque crean una sola solicitud y el otro recibe 409. (`backend/`)
- [ ] Con curl: aceptar (queda `aceptada`, el bloque como confirmado y no se puede quitar, y aparecen los correos de ambos); aceptar o rechazar de nuevo → 409; otro tutor → 404; aceptar una vencida → 409 `SOLICITUD_VENCIDA`. (`backend/`)
- [ ] Con curl: rechazar con motivo (queda `rechazada` con el motivo, el bloque vuelve al calendario público y otro estudiante lo puede solicitar). (`backend/`)
- [ ] Con curl: quitar en "Mi disponibilidad" un bloque con solicitud pendiente → 409 `BLOQUE_CON_SOLICITUD_PENDIENTE`; las pruebas de 009 sobre bloques confirmados siguen pasando. (`backend/`)
- [ ] Correos: comprobar que se lanzan al crear, aceptar y rechazar (en el buzón si el SMTP está configurado, o en el log de fallo sin datos personales si no lo está) y que la respuesta HTTP no espera al envío. (`backend/`)
- [ ] Revisar las respuestas de enviadas y recibidas: sin cédulas, certificados ni solicitudes ajenas, y con correos solo en las aceptadas. (`backend/`)
- [ ] En el navegador: el estudiante solicita desde el perfil (modal, validaciones, éxito y "Mis tutorías"); el tutor ve el contador, acepta y rechaza con motivo; "Mi disponibilidad" refleja cada estado; ver en móvil y en escritorio frente al prototipo. (`frontend/`)
- [ ] Regresión: búsqueda y perfil (008), "Mi disponibilidad" (009), registro y verificación de tutor (006/007), login, Google, logout y Resumen. (`frontend/`, `backend/`)

## Cierre

- [ ] Borrar los datos de prueba `prueba010.*` con el script de limpieza. (`database/`)
- [ ] Revisar el diff completo y confirmar que no hay `console.log`, secretos ni datos de prueba. (`./`)
- [ ] Confirmar que `package.json` y el lock no cambian. (`backend/package.json`, `frontend/package.json`)

## Mantenimiento

- [ ] Mover 009 y 010 a "Hecho" en el roadmap y dejar como siguiente la que el equipo priorice (CAL-TUT-001 o DAS-EST-003). (`constitution/roadmap.md`)
- [ ] Documentar en `tech-stack.md` el módulo `solicitudes`, sus endpoints, el script 007, la regla "una solicitud viva por bloque" en el service con `FOR UPDATE`, el horario retenido por las pendientes y la convención de zona horaria de `fecha_hora_solicitud`; y quitar la nota obsoleta del `UNIQUE` de `disponibilidad_id`. (`constitution/tech-stack.md`)
- [ ] Ejecutar `database/007_solicitud_tutoria.sql` en Aiven al desplegar. (`database/`)
- [ ] Anotar en el backlog: cancelar o reprogramar solicitudes, vencer automáticamente las pendientes pasadas, métodos de pago configurables por el tutor, modalidad y lugar, y notificaciones en la app (DAS-EST-004). (`constitution/roadmap.md`)
