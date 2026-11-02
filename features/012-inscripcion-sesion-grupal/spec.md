# 012 · Inscripción a sesión grupal

## Qué hace

Permite que un estudiante se inscriba a una sesión de tutoría grupal publicada en la 011, desde su tarjeta en "Tutorías grupales". Si hay cupos, la inscripción se confirma de inmediato. Si los cupos se llenaron, el botón se deshabilita y el sistema rechaza cualquier intento de inscribirse, incluso si dos estudiantes pulsan a la vez por el último cupo.

El estudiante ve sus inscripciones en la misma pantalla. El tutor ve cuántos y quiénes se inscribieron en cada una de sus sesiones.

Historia de usuario: GRU-INS-001.

## Por qué

Una sesión grupal publicada (011) no sirve hasta que los estudiantes pueden apuntarse. El cupo lo define el tutor para poder atender bien al grupo; el sistema tiene que hacerlo cumplir, para que la demanda no supere lo que el tutor puede atender. Con esta historia se cierra el MVP: búsqueda, tutorías 1 a 1 y tutorías grupales.

## Criterios de aceptación

### 1. Inscripción dentro del cupo
- [ ] En "Tutorías grupales", cada sesión con cupos disponibles muestra el botón "Inscribirme a la sesión" habilitado. Ya no aparece "Próximamente".
- [ ] Al pulsarlo, el sistema crea la inscripción en estado `confirmada` con el estudiante de la sesión iniciada. Muestra de inmediato "Inscripción confirmada. Te esperamos en la sesión." y la tarjeta se actualiza: badge "Inscrito", ocupación con un cupo más y el botón cambia a "Ya estás inscrito" deshabilitado.
- [ ] El botón muestra el estado de envío y no se puede pulsar dos veces.
- [ ] Una sección "Mis inscripciones", arriba de la lista, muestra las sesiones próximas a las que el estudiante está inscrito: nombre, materia, tutor, fecha, hora, duración y medio de la reunión. Estado vacío propio si no tiene ninguna.
- [ ] No se puede inscribir:
  - A una sesión que no existe, de un tutor que ya no es visible, cancelada, completada o que ya empezó: 409 `SESION_NO_DISPONIBLE`.
  - A una sesión propia (el tutor que la publicó): 409 `SESION_PROPIA`.
  - Dos veces a la misma sesión: 409 `YA_INSCRITO`.
  - Si se cruza con otra sesión grupal a la que ya está inscrito, con una sesión grupal que publicó como tutor o con una tutoría individual `pendiente` o `aceptada` (como estudiante o como tutor): 409 `CHOQUE_DE_HORARIO`, con el detalle.

### 2. Cupos llenos
- [ ] Cuando las inscripciones confirmadas llegan al cupo, la sesión pasa a estado `llena` en la misma operación.
- [ ] Las sesiones llenas siguen apareciendo en "Tutorías grupales" con el badge "Cupos llenos", la barra de ocupación completa y el botón "Sesión sin cupos" deshabilitado.
- [ ] El backend también lo impide: inscribirse a una sesión llena responde 409 `SESION_LLENA` con el mensaje "Esta sesión ya no tiene cupos disponibles", sin crear la inscripción. La pantalla muestra el mensaje y recarga la lista.
- [ ] Si varios estudiantes se inscriben a la vez por los últimos cupos, nunca se confirman más inscripciones que el cupo: los que no alcanzan reciben `SESION_LLENA`.

### 3. Vista del tutor
- [ ] En "Mis sesiones publicadas", cada sesión muestra los cupos ocupados ("N / M cupos") y su estado ("Abierta" o "Llena").
- [ ] El tutor puede ver la lista de inscritos de cada una de sus sesiones ("Ver inscritos"): nombre y correo institucional de cada estudiante, para enviarles el enlace o el lugar de la reunión. Un tutor no puede ver los inscritos de sesiones ajenas (404).

### Datos y seguridad
- [ ] El `estudianteId` sale siempre de la sesión; la sesión grupal sale de la URL.
- [ ] Inscribirse y ver las propias inscripciones lo pueden hacer los roles `estudiante` y `tutor`; ver los inscritos, solo el tutor de esa sesión. El administrador recibe 403 `ACCESO_DENEGADO`.
- [ ] El listado público no expone quiénes están inscritos; solo el número y si el propio usuario lo está. Los correos de los inscritos solo los ve el tutor de la sesión.
- [ ] Las pantallas siguen el prototipo `Saber-Compartido-Dashboard` (tarjetas de `groupsView` y botón "Inscribirme a la sesión" / "Sesión sin cupos"), son usables en móvil y respetan los tokens visuales del tech-stack.
- [ ] Lint sin errores y sin dependencias nuevas.

## Fuera de alcance

- Cancelar la inscripción (estado `cancelada`) y que la sesión vuelva de `llena` a `abierta`.
- Lista de espera cuando la sesión está llena.
- Correos y notificaciones de inscripción (013).
- Editar o cancelar la sesión por parte del tutor.
- Que una inscripción bloquee las solicitudes de tutoría individual del estudiante a la misma hora (en la 010 solo se revisan las tutorías individuales).
- Calificar la sesión grupal (CAL-TUT-001).
