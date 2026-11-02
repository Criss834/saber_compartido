# Plan · 010 Solicitud de tutoría personalizada

## Enfoque

La tabla `solicitudes_tutoria` ya existe:
- Campos: estudiante, tutor, materia, `disponibilidad_id`, `fecha_hora_solicitud`, `mensaje` y `estado` (`pendiente` | `aceptada` | `rechazada` | `completada` | `cancelada`).
- `disponibilidad_id` es solo índice, no `UNIQUE` (revisado en 009). Por eso un bloque puede tener varias solicitudes históricas, y la regla "un bloque solo tiene una solicitud viva" se hace cumplir en el service.

Faltan dos datos que pide la historia: el **método de pago preferido** y el **motivo del rechazo**. Se añaden con un script numerado, el primer cambio de esquema desde 006.

**Estados del horario:**
- **Libre:** activo, futuro y sin solicitud viva.
- **Retenido:** con una solicitud `pendiente`. No aparece en el calendario público y el tutor no lo puede quitar.
- **Bloqueado:** con una solicitud `aceptada` (el "confirmado" de 009).
- **Liberado:** rechazar devuelve el bloque a libre. No hay que tocar `disponibilidad_tutores`, porque el estado se deriva de las solicitudes.

**Notificación por correo.** Se reutiliza Nodemailer de `backend/src/shared/email/`, igual que la verificación de 001: envío asíncrono que no bloquea la respuesta y que, si falla, solo deja un log. La campana del dashboard es DAS-EST-004 y queda fuera; en la app, el tutor ve un contador de pendientes en "Solicitudes recibidas".

**Pantallas** (referencia: el prototipo `Saber-Compartido-Dashboard`):
- **Estudiante:** el perfil del tutor con el calendario seleccionable, el modal "Solicitar una tutoría" y la vista "Mis tutorías" (pestañas y filas `session-item`).
- **Tutor:** la vista "Solicitudes recibidas" (tabla con Aceptar y Rechazar, y modal de rechazo con motivo).

El prototipo pide una "fecha y horario preferidos" libres; aquí se elige un bloque real del calendario de 009. La "Modalidad" del prototipo se sustituye por el método de pago, que es lo que pide la historia.

## Implementación

1. **Esquema.** Crear `database/007_solicitud_tutoria.sql`:
   - `ALTER TABLE solicitudes_tutoria`:
     - `metodo_pago ENUM('efectivo','transferencia','nequi','daviplata') NOT NULL`
     - `motivo_rechazo VARCHAR(300) NULL`
     - `respondido_en TIMESTAMP NULL`
   - Índice `(disponibilidad_id, estado)` para buscar la solicitud viva de un bloque.
   - Precondición: la tabla está vacía; si no, el script falla por el `NOT NULL` y hay que revisarlo.
   - Ejecutarlo en Docker y regenerar con `prisma db pull` y `prisma generate`, sin migraciones.

2. **Módulo `backend/src/modules/solicitudes/`** con el patrón routes → validar → controller → service → repository.
   - `solicitudes.constantes.js`: métodos de pago con su etiqueta y longitudes máximas.
   - `solicitudes.schema.js` (Zod 4):
     - Crear: `{ disponibilidadId, materiaId, metodoPago, mensaje? }`.
     - Rechazar: `{ motivo? }`.
     - `?estado=` opcional: `pendiente`, `aceptada` o `rechazada`.
     - `id` entero positivo.

3. **Crear la solicitud.** `crearSolicitud(estudianteId, datos)` en una transacción interactiva:
   - Bloquear la fila del bloque con `SELECT … FOR UPDATE` (`$queryRaw` dentro de la transacción), para que dos solicitudes simultáneas al mismo bloque se serialicen.
   - Validar en este orden:
     1. El bloque existe y está activo, y su tutor es visible (regla de 008, `esTutorVisible`) y no es el estudiante. Si no, 404 `TUTOR_NO_ENCONTRADO` o 409 `HORARIO_NO_DISPONIBLE`.
     2. El bloque es futuro y está alineado (hora de Colombia, con las utilidades de `disponibilidad/fechas.js`).
     3. No hay ninguna solicitud `pendiente` o `aceptada` sobre el bloque.
     4. La materia está aprobada para ese tutor.
     5. El estudiante no tiene otra solicitud viva a la misma fecha y hora.
   - Insertar con `tutorId` y `fechaHoraSolicitud` tomados del bloque. La fecha y hora se guardan como hora de Colombia con la misma convención UTC de 009: `new Date("YYYY-MM-DDTHH:MM:00Z")`.
   - Después del commit, lanzar el correo al tutor sin esperarlo.

4. **Responder.** `aceptarSolicitud(tutorId, id)` y `rechazarSolicitud(tutorId, id, motivo)`:
   - `updateMany` con `where: { id, tutorId, estado: "pendiente" }`, como en 007, para que dos respuestas simultáneas no pisen el estado. Si `count === 0`, distinguir 404 (no es suya o no existe) de 409 `SOLICITUD_YA_RESPONDIDA`.
   - Aceptar exige que el horario sea futuro (409 `SOLICITUD_VENCIDA`).
   - Se guarda `respondido_en` (y `motivo_rechazo` al rechazar).
   - Después del commit, correo al estudiante.

5. **Consultas.**
   - `listarEnviadas(estudianteId, estado?)` y `listarRecibidas(tutorId, estado?)`: las pendientes primero y luego por fecha de la tutoría.
   - Cada fila trae la contraparte (nombre, y correo solo si está `aceptada`), la materia, `fecha`, `horaInicio`, `horaFin`, el método de pago con su etiqueta, el mensaje, el motivo, el estado, `vencida` (pendiente con el horario ya pasado) y `creadoEn`.
   - `contarPendientesRecibidas(tutorId)` para el contador del sidebar.

6. **Correos.** En `backend/src/shared/email/correo.service.js`, añadir `enviarCorreoNuevaSolicitud`, `enviarCorreoSolicitudAceptada` y `enviarCorreoSolicitudRechazada`:
   - Misma plantilla visual y `escaparHtml`.
   - Enlaces a `${URL_FRONTEND}/dashboard/solicitudes-recibidas` y `/dashboard/mis-tutorias`.
   - Asunto sin datos personales. Los errores se registran sin el correo del destinatario.

7. **Rutas.** Todas con `requerir-sesion`; montar el router en `backend/src/app.js` como `/api/solicitudes`.
   - `POST /api/solicitudes`, `GET /api/solicitudes/enviadas`: `requerirRol("estudiante", "tutor")`.
   - `GET /api/solicitudes/recibidas`, `GET /api/solicitudes/recibidas/pendientes` (`{ pendientes }`), `POST /api/solicitudes/:id/aceptar` y `POST /api/solicitudes/:id/rechazar`: `requerirRol("tutor")`.

8. **Ajustes en 009.**
   - `bloquesLibresDeTutor` excluye también los bloques con una solicitud `pendiente`.
   - El calendario público devuelve el `id` de cada bloque, que ahora hace falta para solicitarlo.
   - `bloquesDeTutorEntre` indica si el bloque tiene una solicitud pendiente.
   - `obtenerMiSemana` devuelve el nuevo estado `pendiente`.
   - `guardarMiSemana` responde 409 `BLOQUE_CON_SOLICITUD_PENDIENTE` si se quita un bloque retenido.
   - El calendario del frontend pinta "Con solicitud pendiente" en ámbar y no lo cambia.

9. **Cliente HTTP.** `frontend/src/features/solicitudes/api-solicitudes.js`, con el patrón de `api-disponibilidad.js`, más las constantes de método de pago y de estado (etiqueta y tono del badge).

10. **Solicitar desde el perfil.**
    - `DisponibilidadPublica` acepta el modo "seleccionable": cada bloque libre es un botón.
    - El modal `modal-solicitar.jsx` (sin librería; `role="dialog"`, foco inicial y cierre con Escape) muestra el tutor, el horario, la materia, el método de pago, el mensaje y el aviso de que no se procesan pagos.
    - Respuestas del servidor:
      - Al enviar, navega a `/dashboard/mis-tutorias` con el mensaje de éxito.
      - Con 409 `HORARIO_NO_DISPONIBLE` muestra el aviso y recarga el calendario.
      - Con 409 `CHOQUE_DE_HORARIO` o 400, muestra el mensaje del servidor.
    - En el perfil, "Solicitar tutoría" se habilita y lleva al panel de disponibilidad (`#disponibilidad`). En la tarjeta de búsqueda, "Solicitar" enlaza al perfil con ese ancla.

11. **"Mis tutorías".** `frontend/src/pages/Dashboard/MisTutorias.jsx`:
    - Pestañas que filtran con `?estado=` en la URL.
    - Filas con un recuadro de fecha (mes y día), la materia, el tutor, el horario, el método de pago, el badge y el motivo si fue rechazada.
    - Estados de carga, error y vacío.
    - El mensaje de éxito llega por `location.state`.
    - La entrada de `navegacion.js` pasa de placeholder a implementada.

12. **"Solicitudes recibidas".** `frontend/src/pages/Dashboard/SolicitudesRecibidas.jsx`:
    - Tabla en escritorio y tarjetas en móvil.
    - Pestañas y badges.
    - "Aceptar" con un estado de carga por fila.
    - "Rechazar" abre un modal con el motivo opcional.
    - Las vencidas sin botones y con la etiqueta "Vencida".
    - Ante un 409, el mensaje y la recarga de la lista.
    - Ruta dentro de `RutaPorRol(["tutor"])`; la entrada va en el grupo "Mi espacio de tutor".

13. **Contador del sidebar.** Un hook `use-pendientes-recibidas.js` pide `/recibidas/pendientes` al montar el layout del tutor y cada vez que una respuesta cambia la lista (un evento simple o el contexto del layout). La entrada muestra el número si es mayor que 0, como en el prototipo.

14. **Validación.** Sin framework de tests:
    - Script HTTP en el scratchpad con datos desechables `prueba010.*`.
    - Concurrencia: dos `POST` simultáneos al mismo bloque.
    - Correos: comprobar el envío con el SMTP de desarrollo o, si no está configurado, que el fallo solo deja un log.
    - `npx oxlint src` en el backend y `npm run lint` en el frontend.
    - Revisión en el navegador frente al prototipo.

## Decisiones

- **Un módulo nuevo `solicitudes`.** Lo usan el estudiante y el tutor con permisos distintos por ruta, y no encaja ni en `busqueda` (solo lectura) ni en `disponibilidad` (bloques del tutor).
- **La solicitud pendiente retiene el horario.** La historia dice que rechazar "libera el horario", así que mientras está pendiente el horario no está libre. Evita que dos estudiantes pidan el mismo bloque y que el tutor tenga que elegir entre ellos.
- **El tutor no puede quitar un bloque retenido.** Primero responde la solicitud. Es la regla más simple y evita solicitudes huérfanas que el estudiante no entendería.
- **El estado del horario se deriva de las solicitudes**, sin columnas nuevas en `disponibilidad_tutores`. Aceptar y rechazar solo tocan `solicitudes_tutoria`.
- **`SELECT … FOR UPDATE` sobre el bloque** al crear, porque sin un `UNIQUE` en la BD es la forma de garantizar una sola solicitud viva por bloque cuando hay concurrencia.
- **`updateMany` condicionado a `pendiente`** al responder, el mismo patrón probado en 007.
- **Método de pago como `ENUM` en la BD** con un catálogo fijo (efectivo, transferencia, Nequi y Daviplata). Que el tutor configure qué métodos acepta (mission.md) queda para después; hoy no hay dónde guardarlo.
- **Correo como notificación.** Ya existe la infraestructura (001) y la campana es otra historia (DAS-EST-004). El contador de pendientes cubre el aviso dentro de la app para el tutor.
- **Correos institucionales visibles solo tras aceptar.** Es necesario para coordinar la sesión (no hay modalidad ni lugar en el alcance) y protege la privacidad mientras la solicitud está pendiente o fue rechazada.
- **"Mis tutorías" y "Solicitudes recibidas" en esta feature**, porque sin ellas el estudiante no ve el resultado y el tutor no puede responder.
- **Sin dependencias nuevas.** Los modales y las pestañas se hacen con React y Tailwind.

## Riesgos

- **Cambio de esquema.** Es el primer `ALTER` sobre `solicitudes_tutoria`. Debe coordinarse antes de ejecutarlo (tech-stack) y repetirse en Aiven al desplegar. Si la tabla tiene filas, el `NOT NULL` falla.
- **`FOR UPDATE` con el adaptador MariaDB de Prisma.** Hay que comprobar que `$queryRaw` dentro de `$transaction` interactiva bloquea de verdad (prueba de dos `POST` simultáneos). Alternativa: aislamiento `Serializable` en la transacción.
- **SMTP en desarrollo.** Si Gmail no está configurado en `.env`, los correos fallan. El flujo no se rompe, pero la notificación no se puede demostrar; se valida al menos que el envío se lanza y que el error se registra sin datos personales.
- **Zona horaria de `fecha_hora_solicitud`.** Es un `DATETIME` sin zona; se guarda la hora de Colombia con la convención UTC de 009 y se documenta. Leerla con getters locales la correría 5 horas.
- **Solicitudes pendientes vencidas.** Sin un proceso que las venza, quedan `pendiente` para siempre. Se muestran como "Vencida", no se pueden aceptar y se pueden rechazar para limpiarlas.
- **Cambio de comportamiento en 009.** Retener bloques pendientes cambia el calendario público y "Mi disponibilidad". Hay que volver a pasar las pruebas de 009 afectadas.
- **Contador del sidebar desactualizado.** Solo se refresca al cargar y al responder; una solicitud nueva aparece al navegar o recargar. Lo de tiempo real es DAS-EST-004.
- **Plazo.** La fecha límite es el 11 de noviembre. Si aprieta, se cortan en este orden: la vista móvil en tarjetas de "Solicitudes recibidas" (se deja la tabla con scroll), el contador del sidebar y el motivo del rechazo.
