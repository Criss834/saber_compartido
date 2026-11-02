# 009 · Disponibilidad del tutor

## Qué hace

Permite que un tutor verificado publique los bloques de horario en los que puede dar tutorías. Desde la entrada "Mi disponibilidad" de su menú ve un calendario semanal (lunes a sábado), marca o desmarca bloques de una hora y guarda los cambios. Los estudiantes ven esos bloques libres en el perfil público del tutor (008) antes de solicitar una tutoría. Un bloque que ya tiene una tutoría confirmada no se puede quitar ni cambiar.

Historia de usuario: DISP-TUT-001.

## Por qué

La solicitud de tutoría (SOL-TUT-001) necesita un horario concreto del tutor (`solicitudes_tutoria.disponibilidad_id`). Sin esta feature el estudiante encuentra al tutor (008) pero no sabe cuándo puede atenderlo, y no hay bloques a los que asociar una solicitud.

## Criterios de aceptación

### 1. Disponibilidad guardada correctamente
- [ ] Un usuario con rol `tutor` ve en el sidebar la entrada "Mi disponibilidad", que abre `/dashboard/mi-disponibilidad`. Un estudiante que todavía no es tutor no ve la entrada, y si abre la ruta es redirigido al Resumen. Sin sesión, la ruta redirige a `/iniciar-sesion`. — implementado: `gruposDeRol("tutor")` añade "Mi espacio de tutor", la ruta está dentro de `RutaPorRol(["tutor"])` (el estudiante va a `/dashboard`) y de `RutaProtegida` (sin sesión, a `/iniciar-sesion`). — **Pendiente de verificar en el navegador.**
- [x] La pantalla muestra un calendario semanal de lunes a sábado con bloques de una hora: 8:00, 9:00, 10:00, 11:00 y 12:00 por la mañana, y 1:00, 2:00, 3:00, 4:00, 5:00 y 6:00 por la tarde (11 bloques por día). La hora es la de Colombia (`America/Bogota`). — el backend devuelve 6 días × 11 bloques (08:00–18:00) calculados con la hora de Colombia, y el frontend los muestra como 8:00 … 12:00 y 1:00 … 6:00.
- [x] El tutor puede moverse entre la semana actual y las 3 siguientes. El encabezado indica la semana que se está viendo (por ejemplo, "3 – 8 nov 2026"). — `semanas` trae el lunes actual y los 3 siguientes; los botones ‹ › se limitan a esa ventana; el rango se formatea como "2 – 7 nov 2026" (comprobado en Node, también al cambiar de mes y de año). Fuera de la ventana el backend responde 400 `SEMANA_FUERA_DE_RANGO`.
- [ ] Al pulsar un bloque libre cambia entre "Disponible" y "No disponible". Los bloques que ya pasaron se ven deshabilitados y no se pueden marcar. — implementado: el botón alterna disponible ↔ no disponible y el estado `pasado` va deshabilitado; el backend marca como `pasado` los bloques que ya empezaron (7 el lunes de la prueba) y rechaza agregarlos (400 `BLOQUE_INVALIDO`). — **Pendiente de verificar en el navegador.**
- [ ] Al pulsar "Guardar disponibilidad" el sistema guarda los bloques de la semana, muestra la confirmación "Disponibilidad guardada" y, al recargar la página, los bloques siguen marcados. — guardar y releer está comprobado con curl (los bloques persisten con la fecha y la hora exactas); el mensaje "Disponibilidad guardada…" está implementado. — **Pendiente de verificar en el navegador.**
- [x] El botón de guardar está deshabilitado mientras no haya cambios o mientras se está guardando. — implementado: `disabled={!hayCambios || guardando || cargando}`, con la ruedita y el texto "Guardando…". — **Pendiente de verificar en el navegador.**
- [x] Los bloques guardados aparecen como disponibles en el calendario público del tutor (perfil de 008). — comprobado: lo que guarda el tutor aparece al instante en `GET /api/disponibilidad/tutores/:id`, y el perfil lo pinta en el panel "Disponibilidad".

### 2. Modificar disponibilidad existente
- [x] Al volver a la pantalla, el calendario carga los bloques ya guardados de cada semana. — `GET /mia?semana=` devuelve lo guardado de cada semana (comprobado con las semanas del 9 y del 16), y la pantalla lo pide al montarse y al cambiar de semana.
- [x] El tutor puede agregar bloques nuevos, quitar bloques libres o cambiar un horario por otro (quitar uno y marcar otro) y guardar. El calendario público refleja el cambio inmediatamente. — comprobado: quitar vie 10:00 y agregar jue 3:00 p. m. y mar 9:00 en un mismo guardado se refleja de inmediato en el calendario público.
- [x] Si el tutor cambia de semana con cambios sin guardar, el sistema le avisa dentro de la página y le permite guardarlos o descartarlos antes de cambiar. — implementado: aviso dentro de la página con "Guardar y continuar", "Descartar cambios" y "Quedarme aquí". — **Pendiente de verificar en el navegador.**
- [ ] El panel "Resumen de la semana" muestra cuántos bloques hay disponibles, cuántos tienen tutoría confirmada y cuántos no están disponibles, y se actualiza mientras el tutor marca bloques. — implementado: los contadores se calculan a partir de lo marcado en pantalla (disponibles, confirmadas y no disponibles, sin contar los pasados). — **Pendiente de verificar en el navegador.**

### 3. Bloque con tutoría ya confirmada
- [x] Un bloque que tiene una solicitud de tutoría `aceptada` se muestra como "Con tutoría confirmada", con su propio color. — comprobado: con una solicitud `aceptada` el backend devuelve el bloque como `confirmado`, que se pinta en `#f0eaff`/`#7041bd` con el texto "Con tutoría confirmada" y su color en la leyenda.
- [x] Si el tutor intenta cambiarlo desde el calendario, el bloque no cambia y aparece el mensaje "No puedes modificar ni eliminar un bloque con una tutoría confirmada". — implementado: `pulsarBloque` no lo cambia y muestra exactamente ese mensaje. — **Pendiente de verificar en el navegador.**
- [x] El backend también lo impide: si el envío quita un bloque confirmado, responde 409 `BLOQUE_CON_TUTORIA_CONFIRMADA` y no guarda ningún cambio de ese envío. La pantalla muestra el mensaje y vuelve a cargar la semana. — comprobado: 409 `BLOQUE_CON_TUTORIA_CONFIRMADA` ("…del miércoles 11 de noviembre a la 1:00 p. m.: tiene una tutoría confirmada") y la BD queda idéntica aunque el envío trajera otro bloque nuevo. La pantalla muestra el mensaje y recarga la semana (`setIntento`); esa parte visual queda en la prueba en el navegador.
- [x] La pantalla muestra el aviso permanente: "Los bloques con una tutoría confirmada no pueden modificarse ni eliminarse". — el texto aparece siempre debajo del calendario, con el tono `status-pending`.

### 4. Sin disponibilidad definida
- [ ] Si el tutor no tiene bloques libres en la semana actual ni en las 3 siguientes, el perfil público muestra "Este tutor no tiene horarios disponibles por el momento" en lugar del calendario. — el backend devuelve `bloques: []` para un tutor sin bloques (comprobado con Pedro), y en ese caso `DisponibilidadPublica` muestra ese mensaje. — **Pendiente de verificar en el navegador.**
- [ ] Si el tutor tiene bloques libres solo en otras semanas, el calendario público se abre en la primera semana que tenga bloques. — implementado: la semana inicial es la del primer bloque libre (`lunesDeBloque`). — **Pendiente de verificar en el navegador.**
- [x] El calendario público solo muestra bloques libres y futuros: no muestra los bloques que ya pasaron ni los que tienen una tutoría confirmada. — comprobado: no aparecen ni un bloque de hoy a las 8:00 (ya pasado) ni el confirmado.

### Datos y seguridad
- [x] El `tutorId` de los bloques sale siempre de la sesión y nunca del cuerpo de la petición. Un tutor no puede leer ni modificar los bloques privados de otro tutor. — `req.usuarioId` en el controller; el cuerpo solo tiene `semana` y `bloques`, y todas las escrituras filtran por `tutorId`. Comprobado: `/mia` de Pedro no muestra los bloques de Laura.
- [x] Las rutas propias (`/api/disponibilidad/mia`) solo las usa el rol `tutor`; los demás roles reciben 403 `ACCESO_DENEGADO`. La ruta pública la usan los roles `estudiante` y `tutor` (el administrador recibe 403), y responde 404 `TUTOR_NO_ENCONTRADO` con las mismas reglas del perfil de 008 (no existe, no tiene materias aprobadas o es el propio usuario). — comprobado: 401 sin sesión; 403 `ACCESO_DENEGADO` al estudiante en `/mia` y al administrador en las 3 rutas; la pública responde 200 al estudiante y a otro tutor, y el mismo 404 para el propio tutor, un id inexistente, una cuenta sin materias aprobadas y el administrador.
- [x] El cuerpo se valida con Zod: fechas dentro de la semana enviada y de la ventana de 4 semanas, horas permitidas, sin bloques pasados ni duplicados. Los datos inválidos devuelven el 400 de Zod o un 400 propio con el contrato `{codigo, mensaje}`. — Zod valida formato, horas permitidas y máximo de 66 bloques; el service valida la ventana, la semana, el día, los bloques pasados y los duplicados con 400 `{codigo, mensaje}`. Los 15 casos inválidos dan 400 sin cambiar la BD.
- [x] El calendario público no expone qué estudiante reservó un bloque ni el estado de las solicitudes. — la respuesta solo tiene `semanas`, `zonaHoraria` y `bloques{fecha, horaInicio, horaFin}`.
- [ ] La pantalla sigue la vista "Mi disponibilidad" del prototipo `Saber-Compartido-Dashboard`: calendario con leyenda, aviso, "Resumen de la semana" y "Cómo funciona". En móvil el calendario pasa a 3 columnas, y la pantalla respeta los tokens visuales del tech-stack. — implementado con el mapeo anotado en tasks.md (calendario de 6 columnas y 3 en ≤650px, leyenda, aviso, "Resumen de la semana" y "Cómo funciona", solo con tokens de `index.css`). — **Pendiente de verificar en el navegador.**
- [x] Lint sin errores y sin dependencias nuevas que no estén justificadas en el plan. — backend y frontend sin errores (solo warnings previos) y ningún `package.json` ni lock cambió.

## Fuera de alcance

- Solicitar, aceptar o rechazar una tutoría (SOL-TUT-001). Aquí el botón "Solicitar" del perfil sigue deshabilitado, y los bloques confirmados para las pruebas se crean con datos de prueba.
- Disponibilidad recurrente ("todos los lunes"): los bloques son concretos (`fecha` + hora), como define el tech-stack.
- Bloques de duración libre, domingos, horario nocturno y zonas horarias distintas de Colombia.
- Más de 4 semanas de anticipación.
- Duplicar una semana en otra o copiar el horario de la semana anterior.
- Modalidad (presencial / en línea) y lugar del bloque.
- Avisar a los estudiantes cuando cambia la disponibilidad.
- Panel "Resumen de disponibilidad" del Resumen del tutor.
