# 011 · Crear sesión grupal

## Qué hace

Permite que un tutor verificado cree una sesión de tutoría grupal para atender a varios estudiantes de la misma materia a la vez. Desde "Sesiones grupales" de su menú pulsa "Nueva sesión grupal" y define:
- El nombre de la sesión.
- La materia (una de las que tiene aprobadas).
- La fecha, la hora de inicio y la duración.
- El medio de la reunión: Google Meet, Microsoft Teams o presencial.
- El número máximo de cupos.
- Una descripción opcional.

Al publicarla, la sesión queda `abierta`, disponible para inscripción. Aparece en "Mis sesiones publicadas" del tutor y en "Tutorías grupales", donde los estudiantes ya la pueden ver. La inscripción en sí es la siguiente feature (012, GRU-INS-001).

Historia de usuario: GRU-TUT-001.

## Por qué

La misión incluye tutorías grupales con cupo limitado además de las 1 a 1 (010). Para el tutor, una sesión grupal atiende de una vez a varios estudiantes con la misma duda; para el estudiante, es otra forma de conseguir ayuda cuando no hay horarios individuales libres. Sin crear sesiones, la inscripción (012) y sus notificaciones (013) no tienen sobre qué trabajar.

## Criterios de aceptación

### 1. Creación de sesión grupal
- [ ] Un usuario con rol `tutor` ve en "Mi espacio de tutor" la entrada "Sesiones grupales", que abre `/dashboard/sesiones-grupales`. Un estudiante que no es tutor no ve la entrada, y si abre la ruta es redirigido al Resumen.
- [ ] La pantalla tiene el formulario "Nueva sesión grupal" del prototipo con:
  - Nombre de la sesión: obligatorio, de 5 a 150 caracteres.
  - Materia: obligatoria, entre las materias aprobadas del tutor; si solo tiene una, viene elegida.
  - Fecha: obligatoria, desde hoy y hasta 4 semanas después.
  - Hora de inicio: obligatoria, en punto o y media, de 7:00 a. m. a 8:00 p. m.
  - Duración: 60, 90 o 120 minutos (90 por defecto). La sesión tiene que terminar a las 9:00 p. m. como muy tarde.
  - Medio de la reunión: obligatorio, entre "Google Meet", "Microsoft Teams" y "Presencial" (sin valor por defecto).
  - Cupo máximo: obligatorio, entero de 2 a 30 (8 por defecto).
  - Descripción: opcional, hasta 1000 caracteres, con contador.

  Tiene los botones "Limpiar" y "Publicar sesión". La hora es la de Colombia (`America/Bogota`).
- [ ] Los errores de cada campo se muestran junto al campo antes de enviar, y el botón "Publicar sesión" muestra el estado de envío y no se puede pulsar dos veces.
- [ ] Al publicar, el sistema crea la sesión en estado `abierta` con el tutor de la sesión iniciada y muestra "Sesión publicada. Los estudiantes ya pueden verla en Tutorías grupales.". El formulario se limpia y la sesión aparece en "Mis sesiones publicadas".
- [ ] No se puede publicar:
  - Con una materia que el tutor no tiene aprobada: 400 `MATERIA_NO_OFRECIDA`.
  - Una sesión que empieza en el pasado o después de la ventana de 4 semanas, o que no cumple las reglas de hora y duración: 400 `HORARIO_INVALIDO`.
  - Una sesión que se cruza con otra sesión grupal suya `abierta` o `llena`, con una tutoría individual `pendiente` o `aceptada`, o con bloques publicados en "Mi disponibilidad": 409 `CHOQUE_DE_HORARIO`, con un mensaje que dice con qué se cruza. Si choca con bloques de disponibilidad, el mensaje indica quitarlos primero en "Mi disponibilidad".

### 2. Publicada como disponible para inscripción
- [ ] "Mis sesiones publicadas" lista las sesiones del tutor: nombre, materia, fecha, hora de inicio y fin, medio de la reunión, cupos ocupados sobre el total (por ejemplo, "0 / 8 cupos") y estado ("Abierta", "Llena", "Cancelada" o "Completada"). Primero las próximas, de la más cercana a la más lejana, y después las pasadas. Estado vacío "Tu próxima sesión empieza aquí".
- [ ] La entrada "Tutorías grupales" del estudiante deja de ser un placeholder. Muestra las sesiones `abiertas` y futuras de todos los tutores verificados, excepto las del propio usuario. Cada tarjeta, como en el prototipo, muestra:
  - Nombre y materia.
  - El tutor, con enlace a su perfil.
  - La fecha y la hora, y la duración.
  - El medio de la reunión ("Google Meet" o "Microsoft Teams" con "Reunión en línea. El tutor compartirá el enlace.", o "Presencial" con "En la universidad. El tutor indicará el lugar.").
  - Los cupos disponibles con la barra de ocupación.
  - La descripción.
  - El botón "Inscribirme" deshabilitado con la etiqueta "Próximamente" hasta la 012.
- [ ] "Tutorías grupales" tiene estados de carga, error con "Reintentar" y vacío ("Aún no hay sesiones grupales abiertas").
- [ ] Una sesión publicada aparece de inmediato en "Tutorías grupales" para los estudiantes, y deja de aparecer cuando su hora de inicio pasa.

### Disponibilidad (cambio en 009)
- [ ] En "Mi disponibilidad", los bloques de una hora que se cruzan con una sesión grupal `abierta` o `llena` se muestran como "Sesión grupal", con su propio color, y no se pueden marcar. El backend rechaza guardarlos (400 `BLOQUE_INVALIDO`) y el calendario público no los ofrece, para que nadie solicite una tutoría individual a esa hora.

### Datos y seguridad
- [ ] El `tutorId` sale siempre de la sesión, nunca del cuerpo.
- [ ] Crear y listar las propias sesiones solo lo puede hacer el rol `tutor`. Ver "Tutorías grupales" lo pueden hacer los roles `estudiante` y `tutor`. El administrador recibe 403 `ACCESO_DENEGADO`.
- [ ] El cuerpo se valida con Zod (textos recortados, fecha `AAAA-MM-DD`, hora `HH:MM`, duración, medio de la reunión y cupo del catálogo y del rango). Los inválidos devuelven el 400 de Zod.
- [ ] El listado público no expone correos, cédulas ni la lista de inscritos; solo el nombre del tutor, su id para enlazar el perfil y los cupos ocupados.
- [ ] Las pantallas siguen el prototipo `Saber-Compartido-Dashboard` (vistas "Sesiones grupales" del tutor y "Tutorías grupales" del estudiante), son usables en móvil y respetan los tokens visuales del tech-stack.
- [ ] Lint sin errores y sin dependencias nuevas que no estén justificadas en el plan.

## Fuera de alcance

- Inscribirse, cancelar la inscripción y el paso de `abierta` a `llena` al completarse el cupo (012, GRU-INS-001).
- Editar o cancelar una sesión publicada, y marcarla como `completada`.
- Notificaciones de sesiones grupales (013) y correos.
- El enlace de la reunión (Meet o Teams) y el lugar exacto de la sesión presencial: solo se registra el medio.
- Sesiones recurrentes ("todos los martes").
- Calificar sesiones grupales (CAL-TUT-001).
- Filtros y búsqueda en "Tutorías grupales".
- El Resumen del estudiante y las estadísticas del prototipo en "Tutorías grupales" (sesiones disponibles, próxima sesión, cupos e inscripciones).
