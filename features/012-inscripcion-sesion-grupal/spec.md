# 012 · Inscripción a sesión grupal

## Qué hace

Permite que un estudiante se inscriba a una sesión de tutoría grupal publicada en la 011, desde su tarjeta en "Tutorías grupales". Si hay cupos, la inscripción se confirma de inmediato. Si los cupos se llenaron, el botón se deshabilita y el sistema rechaza cualquier intento de inscribirse, incluso si dos estudiantes pulsan a la vez por el último cupo.

El estudiante ve sus inscripciones en la misma pantalla. El tutor ve cuántos y quiénes se inscribieron en cada una de sus sesiones.

Historia de usuario: GRU-INS-001.

## Por qué

Una sesión grupal publicada (011) no sirve hasta que los estudiantes pueden apuntarse. El cupo lo define el tutor para poder atender bien al grupo; el sistema tiene que hacerlo cumplir, para que la demanda no supere lo que el tutor puede atender. Con esta historia se cierra el MVP: búsqueda, tutorías 1 a 1 y tutorías grupales.

## Criterios de aceptación

### 1. Inscripción dentro del cupo
- [x] En "Tutorías grupales", cada sesión con cupos disponibles muestra el botón "Inscribirme a la sesión" habilitado. Ya no aparece "Próximamente". — implementado: la tarjeta habilita "Inscribirme a la sesión" cuando hay cupos y ya no muestra "Próximamente". **Pendiente de verificar en el navegador.**
- [x] Al pulsarlo, el sistema crea la inscripción en estado `confirmada` con el estudiante de la sesión iniciada. Muestra de inmediato "Inscripción confirmada. Te esperamos en la sesión." y la tarjeta se actualiza: badge "Inscrito", ocupación con un cupo más y el botón cambia a "Ya estás inscrito" deshabilitado. — comprobado: 201 con la inscripción `confirmada` del estudiante de la sesión, `inscrito: true` y un cupo menos. El aviso "Inscripción confirmada. Te esperamos en la sesión.", el badge "✓ Inscrito" y el botón "✓ Ya estás inscrito" están implementados; la parte visual queda en la prueba en el navegador.
- [x] El botón muestra el estado de envío y no se puede pulsar dos veces. — implementado: "Inscribiendo…" con la ruedita, y todos los botones bloqueados mientras hay una inscripción en curso o la lista se recarga. **Pendiente de verificar en el navegador.**
- [x] Una sección "Mis inscripciones", arriba de la lista, muestra las sesiones próximas a las que el estudiante está inscrito: nombre, materia, tutor, fecha, hora, duración y medio de la reunión. Estado vacío propio si no tiene ninguna. — los datos están comprobados (`GET /inscripciones` trae las próximas con materia, tutor, horario, duración y modalidad); la sección está implementada con su vacío. **Pendiente de verificar en el navegador.**
- [x] No se puede inscribir: — comprobado: inexistente, ya empezada y cancelada → `SESION_NO_DISPONIBLE`; propia → `SESION_PROPIA`; dos veces → `YA_INSCRITO`; cruces con otra sesión inscrita, con la propia sesión del tutor y con una tutoría individual pendiente (como estudiante y como tutor) → `CHOQUE_DE_HORARIO` con el detalle. Ninguno crea inscripciones.
  - A una sesión que no existe, de un tutor que ya no es visible, cancelada, completada o que ya empezó: 409 `SESION_NO_DISPONIBLE`.
  - A una sesión propia (el tutor que la publicó): 409 `SESION_PROPIA`.
  - Dos veces a la misma sesión: 409 `YA_INSCRITO`.
  - Si se cruza con otra sesión grupal a la que ya está inscrito, con una sesión grupal que publicó como tutor o con una tutoría individual `pendiente` o `aceptada` (como estudiante o como tutor): 409 `CHOQUE_DE_HORARIO`, con el detalle.

### 2. Cupos llenos
- [x] Cuando las inscripciones confirmadas llegan al cupo, la sesión pasa a estado `llena` en la misma operación. — comprobado: con 3/3 la sesión pasa a `llena` en la misma petición que confirma la última inscripción (con 2/3 sigue `abierta`).
- [x] Las sesiones llenas siguen apareciendo en "Tutorías grupales" con el badge "Cupos llenos", la barra de ocupación completa y el botón "Sesión sin cupos" deshabilitado. — los datos están comprobados (la sesión llena sigue en las públicas con 0 disponibles); el badge "Cupos llenos", la barra completa y el botón "Sesión sin cupos" están implementados. **Pendiente de verificar en el navegador.**
- [x] El backend también lo impide: inscribirse a una sesión llena responde 409 `SESION_LLENA` con el mensaje "Esta sesión ya no tiene cupos disponibles", sin crear la inscripción. La pantalla muestra el mensaje y recarga la lista. — comprobado: 409 `SESION_LLENA` "Esta sesión ya no tiene cupos disponibles", sin crear la inscripción. La pantalla muestra el mensaje y recarga la lista (implementado).
- [x] Si varios estudiantes se inscriben a la vez por los últimos cupos, nunca se confirman más inscripciones que el cupo: los que no alcanzan reciben `SESION_LLENA`. — comprobado: 5 inscripciones simultáneas a una sesión de cupo 2 → exactamente 2 confirmadas y 3 `SESION_LLENA` (bloqueo `SELECT … FOR UPDATE` sobre la sesión). También en la prueba de humo: 3 a la vez por 2 cupos.

### 3. Vista del tutor
- [x] El tutor tiene en "Mi espacio de tutor" la entrada "Mis sesiones grupales" (`/dashboard/mis-sesiones-grupales`), una pantalla a todo el ancho con: — implementado (`MisSesionesGrupales.jsx`); `GET /mias` con `listaInscritos` está comprobado. **Pendiente de verificar en el navegador.**
  - Estadísticas: próximas, estudiantes inscritos en las próximas, llenas y realizadas.
  - Pestañas "Próximas", "Pasadas" y "Todas".
  - Cada sesión en una tarjeta con fecha, horario, duración, medio de la reunión, descripción, estado, ocupación y la tabla de inscritos ya visible (número, nombre, correo institucional y fecha de inscripción), con el botón "Copiar correos".

  La entrada de creación pasa a llamarse "Nueva sesión grupal", y su panel "Mis sesiones publicadas" queda como resumen (las 3 próximas) con el enlace "Ver todas mis sesiones e inscritos". *(Mejora añadida durante el Frontend, a pedido del equipo.)*
- [x] En "Mis sesiones publicadas", cada sesión muestra los cupos ocupados ("N / M cupos") y su estado ("Abierta" o "Llena"). — comprobado en los datos (`inscritos`, `cupo` y `estado` en `GET /mias`); la fila del resumen y las tarjetas de "Mis sesiones grupales" muestran "N / M cupos" y el estado.
- [x] El tutor puede ver la lista de inscritos de cada una de sus sesiones ("Ver inscritos"): nombre y correo institucional de cada estudiante, para enviarles el enlace o el lugar de la reunión. Un tutor no puede ver los inscritos de sesiones ajenas (404). — comprobado: `GET /:id/inscritos` y `listaInscritos` de `GET /mias` devuelven nombre, correo y fecha solo al tutor de la sesión; otro tutor → 404. Con la mejora, la lista se ve en "Mis sesiones grupales" (tabla ya visible y "Copiar correos") en lugar del desplegable "Ver inscritos" del panel lateral.

### Datos y seguridad
- [x] El `estudianteId` sale siempre de la sesión; la sesión grupal sale de la URL. — comprobado: la inscripción queda del usuario de la sesión iniciada; el `id` de la sesión se valida con Zod (`abc` → 400).
- [x] Inscribirse y ver las propias inscripciones lo pueden hacer los roles `estudiante` y `tutor`; ver los inscritos, solo el tutor de esa sesión. El administrador recibe 403 `ACCESO_DENEGADO`. — comprobado: 401 sin sesión, 403 al administrador en las 3 rutas y al estudiante en los inscritos; un tutor puede inscribirse a sesiones de otro.
- [x] El listado público no expone quiénes están inscritos; solo el número y si el propio usuario lo está. Los correos de los inscritos solo los ve el tutor de la sesión. — comprobado: las públicas solo traen `inscritos` (número) e `inscrito` (propio); "Mis inscripciones" no trae correos; los correos solo llegan al tutor de la sesión.
- [x] Las pantallas siguen el prototipo `Saber-Compartido-Dashboard` (tarjetas de `groupsView` y botón "Inscribirme a la sesión" / "Sesión sin cupos"), son usables en móvil y respetan los tokens visuales del tech-stack. — implementado con las clases del prototipo. **Pendiente de verificar en el navegador.**
- [x] Lint sin errores y sin dependencias nuevas. — backend y frontend sin errores (solo los warnings previos); sin dependencias nuevas; `vite build` correcto.

## Fuera de alcance

- Cancelar la inscripción (estado `cancelada`) y que la sesión vuelva de `llena` a `abierta`.
- Lista de espera cuando la sesión está llena.
- Correos y notificaciones de inscripción (013).
- Editar o cancelar la sesión por parte del tutor.
- Que una inscripción bloquee las solicitudes de tutoría individual del estudiante a la misma hora (en la 010 solo se revisan las tutorías individuales).
- Calificar la sesión grupal (CAL-TUT-001).
