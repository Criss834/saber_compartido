# 008 · Búsqueda de tutores

## Qué hace

Permite que un usuario con sesión iniciada encuentre tutores verificados de la plataforma. Desde la entrada "Buscar tutores" del espacio académico ve una lista de tutores con su calificación y las materias que enseña, y puede buscar por nombre o materia y filtrar por materia, calificación y promedio. Desde cada tarjeta abre el perfil público del tutor.

## Por qué

Es el punto donde el estudiante encuentra a quién pedirle una tutoría. Sin esta búsqueda, la verificación (007) no tiene salida visible para el estudiante y las siguientes features (disponibilidad y solicitud de tutoría) no tienen por dónde empezar.

## Criterios de aceptación

### Lista y búsqueda
- [x] La entrada "Buscar tutores" del sidebar deja de ser un placeholder y abre la pantalla de búsqueda. Sin sesión redirige a `/iniciar-sesion`.
- [x] La lista muestra solo tutores con al menos una materia en estado `aprobado`, y de cada tutor solo sus materias aprobadas. Nunca aparecen solicitudes `pendiente` o `rechazado`.
- [x] El usuario no se ve a sí mismo en los resultados.
- [x] Cada tarjeta muestra: avatar con iniciales, nombre completo con marca de verificado, programa ("Tecnología en Desarrollo de Software"), calificación promedio con la cantidad de calificaciones (o "Aún sin calificaciones"), la descripción del tutor si la escribió y las materias aprobadas, cada una con el promedio del tutor en esa materia.
- [x] El buscador filtra por nombre del tutor o nombre de materia, ignorando mayúsculas y tildes.
- [x] Hay un filtro por materia, que es el filtro principal de la búsqueda: al elegir una materia se listan solo los tutores verificados que la ofrecen, con su calificación y su promedio en esa materia. El filtro incluye las materias que tienen al menos un tutor aprobado.
- [x] Hay un filtro con las opciones "Todos", "Calificación 4.8 o más" y "Promedio 4.5 o más" (promedio en la materia). Si se filtra por una materia, el promedio se evalúa sobre esa materia.
- [x] Los filtros se combinan entre sí y el encabezado muestra cuántos tutores coinciden.
- [x] Los resultados se ordenan por calificación (los mejores primero) y, a igualdad o sin calificación, por promedio en la materia. Se devuelven como máximo 50.
- [x] El texto de búsqueda y los filtros se reflejan en la URL, de modo que recargar la página o compartir el enlace conserva la búsqueda.
- [x] El buscador de la barra superior lleva al usuario a esta pantalla con su texto ya aplicado.
- [x] Estados de carga y de error con "Reintentar". Estado vacío con tres mensajes: si la materia elegida no tiene tutores verificados, "No hay tutores disponibles para esta materia"; si hay otros filtros activos sin resultados, "No encontramos tutores con esos filtros" (ambos con el botón "Limpiar filtros"); y si aún no hay ningún tutor verificado en la plataforma, un mensaje propio.

### Perfil público del tutor
- [x] Al pulsar "Ver perfil" se abre una página con: nombre, verificado, programa (tecnología en desarrollo de software), calificación promedio (calificacion que le dan los otros estudiantes, no calificacion académica) y cantidad de calificaciones, descripción, y las materias aprobadas con el promedio de cada una.
- [x] Si el tutor no existe, no tiene materias aprobadas o es el propio usuario, la página muestra "no encontrado" (404 del backend), sin revelar cuál de los casos es.
- [x] El botón "Solicitar" aparece deshabilitado con la etiqueta "Próximamente" hasta que exista la solicitud de tutoría.

### Datos y seguridad
- [x] La API no expone correo, cédula, certificado, estado de otras solicitudes ni identificadores internos innecesarios de otros usuarios.
- [x] Los parámetros de búsqueda se validan con Zod en el servidor; los inválidos devuelven el 400 de Zod.
- [x] Solo los usuarios autenticados con rol `estudiante` o `tutor` acceden. En el frontend, el administrador es redirigido como en el resto de rutas de estudiante, y en el backend `/api/busqueda/*` le responde 403 `ACCESO_DENEGADO`.
- [x] Los errores siguen el contrato `{codigo, mensaje}` y el 400 de Zod `{mensaje, detalle}`.
- [x] Las pantallas siguen el prototipo `Saber-Compartido-Dashboard`, son usables en móvil (una columna) y respetan los tokens visuales del tech-stack.
- [x] Lint sin errores y sin dependencias nuevas que no estén justificadas en el plan.

## Fuera de alcance

- Calendario de disponibilidad del tutor (DISP-TUT-001) y solicitud de tutoría (SOL-TUT-001).
- Semestre del tutor, etiquetas por tema, cantidad de sesiones dadas y cualquier dato que hoy no se captura.
- Paginación, orden configurable por el usuario y búsqueda por programa (hoy hay un único programa).
- Favoritos, tutorías grupales y notificaciones.
- "Tutores recomendados" del Resumen: sigue con la lista vacía.
- Cambiar o editar el perfil del tutor.