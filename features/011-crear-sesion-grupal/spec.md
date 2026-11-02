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
- [x] Un usuario con rol `tutor` ve en "Mi espacio de tutor" la entrada "Sesiones grupales", que abre `/dashboard/sesiones-grupales`. Un estudiante que no es tutor no ve la entrada, y si abre la ruta es redirigido al Resumen. — implementado: entrada en el grupo "Mi espacio de tutor" de `navegacion.js` (solo para `tutor`) y ruta dentro de `RutaPorRol(["tutor"])`, que manda al estudiante a `/dashboard`; el backend también da 403 al estudiante en `POST`, `/mias` y `/materias`. **Pendiente de verificar en el navegador.**
- [x] La pantalla tiene el formulario "Nueva sesión grupal" del prototipo con: — el formulario tiene todos los campos con esas reglas, y el backend las aplica (comprobado). La prueba manual en el navegador lo confirma: la sesión "Ecuaciones 3x3" de Miguel se publicó desde el formulario con materia, fecha, hora, 60 minutos, Google Meet, cupo 8 y descripción. La revisión visual frente al prototipo queda en el último criterio.
  - Nombre de la sesión: obligatorio, de 5 a 150 caracteres.
  - Materia: obligatoria, entre las materias aprobadas del tutor; si solo tiene una, viene elegida.
  - Fecha: obligatoria, desde hoy y hasta 4 semanas después.
  - Hora de inicio: obligatoria, en punto o y media, de 7:00 a. m. a 8:00 p. m.
  - Duración: 60, 90 o 120 minutos (90 por defecto). La sesión tiene que terminar a las 9:00 p. m. como muy tarde.
  - Medio de la reunión: obligatorio, entre "Google Meet", "Microsoft Teams" y "Presencial" (sin valor por defecto).
  - Cupo máximo: obligatorio, entero de 2 a 30 (8 por defecto).
  - Descripción: opcional, hasta 1000 caracteres, con contador.

  Tiene los botones "Limpiar" y "Publicar sesión". La hora es la de Colombia (`America/Bogota`).
- [x] Los errores de cada campo se muestran junto al campo antes de enviar, y el botón "Publicar sesión" muestra el estado de envío y no se puede pulsar dos veces. — implementado: validación en el cliente con el error junto a cada campo (`aria-invalid` y `aria-describedby`) y el botón "Publicando…" deshabilitado mientras envía. **Pendiente de verificar en el navegador.**
- [x] Al publicar, el sistema crea la sesión en estado `abierta` con el tutor de la sesión iniciada y muestra "Sesión publicada. Los estudiantes ya pueden verla en Tutorías grupales.". El formulario se limpia y la sesión aparece en "Mis sesiones publicadas". — comprobado: 201 `abierta` con el tutor de la sesión iniciada, la fecha y hora exactas en la BD y la sesión en "mías"; las dos sesiones de Miguel muestran que también funciona desde el navegador. El mensaje de éxito y la limpieza del formulario están implementados.
- [x] No se puede publicar: — comprobado: materia no aprobada → 400 `MATERIA_NO_OFRECIDA`; pasado, fuera de la ventana y fin después de las 9:00 p. m. → 400 `HORARIO_INVALIDO`; cruce con otra sesión, con una tutoría pendiente que da, con una confirmada que recibe y con un bloque publicado → 409 `CHOQUE_DE_HORARIO` con el detalle (el de bloques dice "Quítalo en \"Mi disponibilidad\"…"); los bordes no chocan; dos publicaciones simultáneas que se cruzan → 201 y 409.
  - Con una materia que el tutor no tiene aprobada: 400 `MATERIA_NO_OFRECIDA`.
  - Una sesión que empieza en el pasado o después de la ventana de 4 semanas, o que no cumple las reglas de hora y duración: 400 `HORARIO_INVALIDO`.
  - Una sesión que se cruza con otra sesión grupal suya `abierta` o `llena`, con una tutoría individual `pendiente` o `aceptada`, o con bloques publicados en "Mi disponibilidad": 409 `CHOQUE_DE_HORARIO`, con un mensaje que dice con qué se cruza. Si choca con bloques de disponibilidad, el mensaje indica quitarlos primero en "Mi disponibilidad".

### 2. Publicada como disponible para inscripción
- [x] "Mis sesiones publicadas" lista las sesiones del tutor: nombre, materia, fecha, hora de inicio y fin, medio de la reunión, cupos ocupados sobre el total (por ejemplo, "0 / 8 cupos") y estado ("Abierta", "Llena", "Cancelada" o "Completada"). Primero las próximas, de la más cercana a la más lejana, y después las pasadas. Estado vacío "Tu próxima sesión empieza aquí". — comprobado en los datos: nombre, materia, fecha, horas, medio de la reunión, "inscritos / cupo", estado y `pasada`; las próximas por fecha y las pasadas al final. La fila muestra todo eso y el estado vacío está implementado.
- [x] La entrada "Tutorías grupales" del estudiante deja de ser un placeholder. Muestra las sesiones `abiertas` y futuras de todos los tutores verificados, excepto las del propio usuario. Cada tarjeta, como en el prototipo, muestra: — implementado en `tarjeta-sesion-grupal.jsx` con todos esos elementos, incluido el medio de la reunión con su texto de apoyo. Los datos están comprobados: el estudiante ve las sesiones abiertas y futuras de otros tutores, con `tutor {id, nombreCompleto}`, y no las propias. **Pendiente de verificar en el navegador.**
  - Nombre y materia.
  - El tutor, con enlace a su perfil.
  - La fecha y la hora, y la duración.
  - El medio de la reunión ("Google Meet" o "Microsoft Teams" con "Reunión en línea. El tutor compartirá el enlace.", o "Presencial" con "En la universidad. El tutor indicará el lugar.").
  - Los cupos disponibles con la barra de ocupación.
  - La descripción.
  - El botón "Inscribirme" deshabilitado con la etiqueta "Próximamente" hasta la 012.
- [x] "Tutorías grupales" tiene estados de carga, error con "Reintentar" y vacío ("Aún no hay sesiones grupales abiertas"). — implementado. **Pendiente de verificar en el navegador.**
- [x] Una sesión publicada aparece de inmediato en "Tutorías grupales" para los estudiantes, y deja de aparecer cuando su hora de inicio pasa. — comprobado: la sesión aparece en la siguiente consulta del estudiante; una sesión de hoy a las 7:00 a. m. no aparece y en "mías" sale como pasada.

### Disponibilidad (cambio en 009)
- [x] En "Mi disponibilidad", los bloques de una hora que se cruzan con una sesión grupal `abierta` o `llena` se muestran como "Sesión grupal", con su propio color, y no se pueden marcar. El backend rechaza guardarlos (400 `BLOQUE_INVALIDO`) y el calendario público no los ofrece, para que nadie solicite una tutoría individual a esa hora. — comprobado: las horas 13, 14, 15 y 16 del martes salen como `sesion_grupal`, guardar las 15:00 → 400 `BLOQUE_INVALIDO` y un bloque anterior que se cruza no se ofrece en el calendario público. El calendario las pinta en azul ("Sesión grupal") y no las cambia; la parte visual queda en la prueba en el navegador.

### Datos y seguridad
- [x] El `tutorId` sale siempre de la sesión, nunca del cuerpo. — comprobado: un `tutorId` en el cuerpo se ignora y la sesión queda del usuario de la sesión iniciada.
- [x] Crear y listar las propias sesiones solo lo puede hacer el rol `tutor`. Ver "Tutorías grupales" lo pueden hacer los roles `estudiante` y `tutor`. El administrador recibe 403 `ACCESO_DENEGADO`. — comprobado: 401 sin sesión; 403 al administrador en las 4 rutas y al estudiante en las 3 de tutor; `GET /` da 200 al estudiante y al tutor.
- [x] El cuerpo se valida con Zod (textos recortados, fecha `AAAA-MM-DD`, hora `HH:MM`, duración, medio de la reunión y cupo del catálogo y del rango). Los inválidos devuelven el 400 de Zod. — comprobado: título corto, horas 14:15 y 6:30, duración 45, cupo 1 y 31, sin modalidad o `zoom`, descripción de 1001 caracteres, `materiaId` inválido y fecha imposible → 400 de Zod; título y descripción recortados, y la descripción vacía queda `null`.
- [x] El listado público no expone correos, cédulas ni la lista de inscritos; solo el nombre del tutor, su id para enlazar el perfil y los cupos ocupados. — comprobado: las públicas solo traen `tutor {id, nombreCompleto}` y el número de inscritos, sin correos, cédulas ni lista de inscritos.
- [x] Las pantallas siguen el prototipo `Saber-Compartido-Dashboard` (vistas "Sesiones grupales" del tutor y "Tutorías grupales" del estudiante), son usables en móvil y respetan los tokens visuales del tech-stack. — implementado según el mapeo anotado en tasks.md (formulario a una columna, tarjetas a una columna y paneles apilados en ≤900px). **Pendiente de verificar en el navegador.**
- [x] Lint sin errores y sin dependencias nuevas que no estén justificadas en el plan. — backend y frontend sin errores (solo los warnings previos); sin dependencias nuevas; `vite build` correcto.

## Fuera de alcance

- Inscribirse, cancelar la inscripción y el paso de `abierta` a `llena` al completarse el cupo (012, GRU-INS-001).
- Editar o cancelar una sesión publicada, y marcarla como `completada`.
- Notificaciones de sesiones grupales (013) y correos.
- El enlace de la reunión (Meet o Teams) y el lugar exacto de la sesión presencial: solo se registra el medio.
- Sesiones recurrentes ("todos los martes").
- Calificar sesiones grupales (CAL-TUT-001).
- Filtros y búsqueda en "Tutorías grupales".
- El Resumen del estudiante y las estadísticas del prototipo en "Tutorías grupales" (sesiones disponibles, próxima sesión, cupos e inscripciones).
