# Plan · 012 Inscripción a sesión grupal

## Enfoque

La tabla `inscripciones_sesion_grupal` ya existe desde `001_schema_inicial.sql`: `sesion_grupal_id`, `estudiante_id`, `inscrito_en`, `estado` (`confirmada` | `cancelada`) y `UNIQUE (sesion_grupal_id, estudiante_id)`. No hace falta cambiar el esquema.

El tech-stack ya fija la regla del cupo: se cuenta con las inscripciones `confirmada` y, al llegar al máximo, se deshabilitan nuevas inscripciones.

**Garantía del cupo.** Cada inscripción se hace en una transacción que primero bloquea la fila de la sesión con `SELECT … FOR UPDATE`, el mismo patrón de la 010. Dentro de ella se cuentan las confirmadas, se inserta y, si se llegó al cupo, se pasa la sesión a `llena`. Así dos inscripciones simultáneas por el último cupo se serializan y la segunda ve la sesión llena. El `UNIQUE` de la BD respalda la regla de "una inscripción por estudiante".

Todo vive en el módulo `tutorias-grupales` de la 011, que ya tiene los intervalos, las sesiones y las reglas de agenda.

**Pantallas.** Se reutiliza la tarjeta de la 011 (`groupsView` del prototipo): el botón pasa a "Inscribirme a la sesión" (`accent`) o "Sesión sin cupos" (deshabilitado), y se añade la sección "Mis inscripciones" en la misma pantalla. En "Mis sesiones publicadas" del tutor se añade "Ver inscritos".

## Implementación

1. **Repository** (`tutorias-grupales.repository.js`):
   - Bloquear la sesión con `SELECT … FOR UPDATE`.
   - Leer la sesión con su tutor y su estado.
   - Contar las confirmadas.
   - Buscar la inscripción del estudiante en esa sesión.
   - Insertar la inscripción y pasar la sesión a `llena`.
   - Sesiones grupales a las que el usuario está inscrito en un día, para los choques.
   - Inscripciones próximas del usuario, con sesión, materia y tutor.
   - Inscritos de una sesión, con nombre y correo.
   - En la consulta pública: incluir también las `llena` futuras y saber si el usuario está inscrito en cada una.

2. **Service** (`tutorias-grupales.service.js`):
   - `inscribirse(estudianteId, sesionId)`, dentro de una transacción, en este orden:
     1. Bloquea la sesión.
     2. La sesión debe existir, ser de un tutor visible y no haber empezado, y no estar cancelada ni completada (409 `SESION_NO_DISPONIBLE`).
     3. No puede ser una sesión propia (409 `SESION_PROPIA`).
     4. El estudiante no puede estar ya inscrito (409 `YA_INSCRITO`).
     5. La sesión no puede estar llena: `llena` o confirmadas ≥ cupo (409 `SESION_LLENA`).
     6. Sin choques con su agenda (409 `CHOQUE_DE_HORARIO`): sesiones a las que ya está inscrito, sesiones que publicó como tutor y tutorías individuales vivas, reutilizando `intervalos.js`.

     Después inserta la inscripción `confirmada` y, si confirmadas + 1 = cupo, pasa la sesión a `llena`. Devuelve la sesión actualizada con `inscrito: true`.
   - `listarMisInscripciones(usuarioId)`: las próximas, ordenadas por fecha.
   - `listarInscritos(tutorId, sesionId)`: 404 `SESION_NO_ENCONTRADA` si no es suya; devuelve `{ inscritos: [{ nombreCompleto, correo, inscritoEn }] }`.
   - `listarPublicas`: incluye las llenas e `inscrito` por sesión.

3. **Rutas** (`tutorias-grupales.routes.js`):
   - `POST /api/sesiones-grupales/:id/inscripcion` y `GET /api/sesiones-grupales/inscripciones`: `requerirRol("estudiante", "tutor")`.
   - `GET /api/sesiones-grupales/:id/inscritos`: `requerirRol("tutor")`.
   - El `id` se valida con Zod.

4. **Frontend:**
   - **Cliente.** `api-tutorias-grupales.js`: inscribirse, mis inscripciones e inscritos.
   - **Tarjeta.** `tarjeta-sesion-grupal.jsx`, botón según el estado:
     - Habilitado "Inscribirme a la sesión", con estado de envío.
     - "Ya estás inscrito", con badge "Inscrito".
     - "Sesión sin cupos", con badge "Cupos llenos".
   - **"Tutorías grupales".** `TutoriasGrupales.jsx`:
     - Al inscribirse, aviso de éxito y recarga de la lista y de "Mis inscripciones".
     - Ante un 409, el aviso con el mensaje y la recarga.
     - Sección "Mis inscripciones" con su estado vacío.
   - **"Sesiones grupales" del tutor.** `SesionesGrupales.jsx`: botón "Ver inscritos" en cada fila que despliega la lista (nombre y correo) con su carga y su vacío.
   - **Correos.** Solicitar y aceptar ya lanzan `solicitudes:cambio`; inscribirse no envía correos.

5. **Validación.**
   - Script HTTP en el scratchpad con datos `prueba012.*`. No envía correos: las tutorías individuales para los choques se insertan en la BD.
   - Concurrencia: varios `POST` simultáneos por los últimos cupos.
   - Volver a pasar la batería de la 011.
   - `npx oxlint src` y `npm run lint`.

## Decisiones

- **Sin cambios de esquema.** La tabla y su `UNIQUE` ya cubren la historia.
- **`FOR UPDATE` sobre la sesión** para que el cupo nunca se supere, el mismo patrón probado en la 010 y la 011.
- **`llena` se guarda en la sesión**, no solo se calcula, para que la lista pública y el estado del tutor lo muestren sin recalcular, como prevé el tech-stack.
- **Las sesiones llenas siguen visibles**, con el botón deshabilitado, tal como pide el criterio "Cupos llenos".
- **Choques con la agenda del estudiante**, porque inscribirse a dos cosas a la misma hora no tiene sentido. Se reutiliza la lógica de intervalos de la 011.
- **Correos de los inscritos solo para el tutor de la sesión**: los necesita para enviar el enlace o el lugar, y nadie más los ve.
- **Sin cancelación de inscripciones** en el MVP, para no tener que reabrir cupos ni pasar de `llena` a `abierta` el día antes de la exposición.
- **Sin correos.** No los pide la historia, y así no se añade riesgo con el SMTP antes del despliegue.

## Riesgos

- **Plazo: el despliegue es mañana.** Si aprieta, se cortan en este orden: "Ver inscritos" del tutor (queda el número "N / M"), los choques de agenda (quedan las reglas del cupo) y la sección "Mis inscripciones" (queda el badge "Inscrito" en la tarjeta).
- **Sin cancelación**, una sesión llena no vuelve a abrirse. Aceptable para el MVP; queda en el backlog.
- **Choque inverso no cubierto.** La 010 no revisa las inscripciones grupales al solicitar una tutoría individual. Queda anotado.
- **Zona horaria.** Igual que en la 011: `fecha_hora_sesion` está en hora de Colombia con la convención UTC.
