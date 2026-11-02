# 009 · Disponibilidad del tutor

## Qué hace

Permite que un tutor verificado publique los bloques de horario en los que puede dar tutorías. Desde la entrada "Mi disponibilidad" de su menú ve un calendario semanal (lunes a sábado), marca o desmarca bloques de una hora y guarda los cambios. Los estudiantes ven esos bloques libres en el perfil público del tutor (008) antes de solicitar una tutoría. Un bloque que ya tiene una tutoría confirmada no se puede quitar ni cambiar.

Historia de usuario: DISP-TUT-001.

## Por qué

La solicitud de tutoría (SOL-TUT-001) necesita un horario concreto del tutor (`solicitudes_tutoria.disponibilidad_id`). Sin esta feature el estudiante encuentra al tutor (008) pero no sabe cuándo puede atenderlo, y no hay bloques a los que asociar una solicitud.

## Criterios de aceptación

### 1. Disponibilidad guardada correctamente
- [ ] Un usuario con rol `tutor` ve en el sidebar la entrada "Mi disponibilidad", que abre `/dashboard/mi-disponibilidad`. Un estudiante que todavía no es tutor no ve la entrada, y si abre la ruta es redirigido al Resumen. Sin sesión, la ruta redirige a `/iniciar-sesion`.
- [ ] La pantalla muestra un calendario semanal de lunes a sábado con bloques de una hora: 8:00, 9:00, 10:00, 11:00 y 12:00 por la mañana, y 1:00, 2:00, 3:00, 4:00, 5:00 y 6:00 por la tarde (11 bloques por día). La hora es la de Colombia (`America/Bogota`).
- [ ] El tutor puede moverse entre la semana actual y las 3 siguientes. El encabezado indica la semana que se está viendo (por ejemplo, "3 – 8 nov 2026").
- [ ] Al pulsar un bloque libre cambia entre "Disponible" y "No disponible". Los bloques que ya pasaron se ven deshabilitados y no se pueden marcar.
- [ ] Al pulsar "Guardar disponibilidad" el sistema guarda los bloques de la semana, muestra la confirmación "Disponibilidad guardada" y, al recargar la página, los bloques siguen marcados.
- [ ] El botón de guardar está deshabilitado mientras no haya cambios o mientras se está guardando.
- [ ] Los bloques guardados aparecen como disponibles en el calendario público del tutor (perfil de 008).

### 2. Modificar disponibilidad existente
- [ ] Al volver a la pantalla, el calendario carga los bloques ya guardados de cada semana.
- [ ] El tutor puede agregar bloques nuevos, quitar bloques libres o cambiar un horario por otro (quitar uno y marcar otro) y guardar. El calendario público refleja el cambio inmediatamente.
- [ ] Si el tutor cambia de semana con cambios sin guardar, el sistema le avisa dentro de la página y le permite guardarlos o descartarlos antes de cambiar.
- [ ] El panel "Resumen de la semana" muestra cuántos bloques hay disponibles, cuántos tienen tutoría confirmada y cuántos no están disponibles, y se actualiza mientras el tutor marca bloques.

### 3. Bloque con tutoría ya confirmada
- [ ] Un bloque que tiene una solicitud de tutoría `aceptada` se muestra como "Con tutoría confirmada", con su propio color.
- [ ] Si el tutor intenta cambiarlo desde el calendario, el bloque no cambia y aparece el mensaje "No puedes modificar ni eliminar un bloque con una tutoría confirmada".
- [ ] El backend también lo impide: si el envío quita un bloque confirmado, responde 409 `BLOQUE_CON_TUTORIA_CONFIRMADA` y no guarda ningún cambio de ese envío. La pantalla muestra el mensaje y vuelve a cargar la semana.
- [ ] La pantalla muestra el aviso permanente: "Los bloques con una tutoría confirmada no pueden modificarse ni eliminarse".

### 4. Sin disponibilidad definida
- [ ] Si el tutor no tiene bloques libres en la semana actual ni en las 3 siguientes, el perfil público muestra "Este tutor no tiene horarios disponibles por el momento" en lugar del calendario.
- [ ] Si el tutor tiene bloques libres solo en otras semanas, el calendario público se abre en la primera semana que tenga bloques.
- [ ] El calendario público solo muestra bloques libres y futuros: no muestra los bloques que ya pasaron ni los que tienen una tutoría confirmada.

### Datos y seguridad
- [ ] El `tutorId` de los bloques sale siempre de la sesión y nunca del cuerpo de la petición. Un tutor no puede leer ni modificar los bloques privados de otro tutor.
- [ ] Las rutas propias (`/api/disponibilidad/mia`) solo las usa el rol `tutor`; los demás roles reciben 403 `ACCESO_DENEGADO`. La ruta pública la usan los roles `estudiante` y `tutor` (el administrador recibe 403), y responde 404 `TUTOR_NO_ENCONTRADO` con las mismas reglas del perfil de 008 (no existe, no tiene materias aprobadas o es el propio usuario).
- [ ] El cuerpo se valida con Zod: fechas dentro de la semana enviada y de la ventana de 4 semanas, horas permitidas, sin bloques pasados ni duplicados. Los datos inválidos devuelven el 400 de Zod o un 400 propio con el contrato `{codigo, mensaje}`.
- [ ] El calendario público no expone qué estudiante reservó un bloque ni el estado de las solicitudes.
- [ ] La pantalla sigue la vista "Mi disponibilidad" del prototipo `Saber-Compartido-Dashboard`: calendario con leyenda, aviso, "Resumen de la semana" y "Cómo funciona". En móvil el calendario pasa a 3 columnas, y la pantalla respeta los tokens visuales del tech-stack.
- [ ] Lint sin errores y sin dependencias nuevas que no estén justificadas en el plan.

## Fuera de alcance

- Solicitar, aceptar o rechazar una tutoría (SOL-TUT-001). Aquí el botón "Solicitar" del perfil sigue deshabilitado, y los bloques confirmados para las pruebas se crean con datos de prueba.
- Disponibilidad recurrente ("todos los lunes"): los bloques son concretos (`fecha` + hora), como define el tech-stack.
- Bloques de duración libre, domingos, horario nocturno y zonas horarias distintas de Colombia.
- Más de 4 semanas de anticipación.
- Duplicar una semana en otra o copiar el horario de la semana anterior.
- Modalidad (presencial / en línea) y lugar del bloque.
- Avisar a los estudiantes cuando cambia la disponibilidad.
- Panel "Resumen de disponibilidad" del Resumen del tutor.
