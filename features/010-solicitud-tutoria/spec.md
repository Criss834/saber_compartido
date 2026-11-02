# 010 · Solicitud de tutoría personalizada

## Qué hace

Permite que un estudiante pida una tutoría 1 a 1 a un tutor verificado. Desde el perfil público del tutor (008), elige un horario libre en su calendario (009), la materia, su método de pago preferido y, si quiere, un mensaje, y confirma. La solicitud queda `pendiente` y el tutor recibe un correo.

El tutor ve sus solicitudes en "Solicitudes recibidas" y las acepta o las rechaza:
- Al aceptar, la tutoría queda confirmada y el horario bloqueado en su calendario.
- Al rechazar, el horario vuelve a estar libre y el estudiante recibe un correo.

El estudiante sigue el estado de sus solicitudes en "Mis tutorías".

Historia de usuario: SOL-TUT-001.

## Por qué

Es el objetivo central de la plataforma: que el estudiante reciba ayuda de un compañero en un horario que ambos pueden cumplir. La búsqueda (008) y la disponibilidad (009) llevan hasta aquí. Esta feature cierra el ciclo y deja tutorías confirmadas sobre las que más adelante se califica (CAL-TUT-001).

## Criterios de aceptación

### 1. Solicitud enviada
- [x] En el perfil público del tutor, el botón "Solicitar tutoría" deja de ser "Próximamente". Lleva al calendario de disponibilidad, donde cada bloque libre se puede seleccionar. En la búsqueda, el botón "Solicitar" de la tarjeta abre ese perfil en el calendario. — implementado: el botón del perfil baja a `#disponibilidad`, cada bloque libre del calendario público es un botón (el backend ya devuelve el `id`) y "Solicitar" de la tarjeta enlaza al perfil con ese ancla. **Pendiente de verificar en el navegador.**
- [x] Al elegir un bloque se abre el formulario "Solicitar una tutoría" con: — implementado en `modal-solicitar.jsx` con esos campos, la materia preelegida si solo hay una y la validación de obligatorios en el cliente (el servidor también los valida). **Pendiente de verificar en el navegador.**
  - El tutor y el horario elegido (día y hora de Colombia).
  - La materia: obligatoria, entre las materias aprobadas del tutor; si solo tiene una, viene elegida.
  - El método de pago preferido: obligatorio, entre "Efectivo", "Transferencia bancaria", "Nequi" y "Daviplata".
  - Un mensaje opcional ("¿Qué te gustaría reforzar?", hasta 500 caracteres).
  - Los botones "Cancelar" y "Enviar solicitud".
- [x] El formulario aclara que la plataforma solo registra la preferencia de pago y no procesa pagos. — el modal muestra bajo el método de pago: "Saber Compartido solo registra tu método de pago preferido; no procesa pagos…", y el correo al tutor lo repite.
- [x] Al confirmar, el sistema crea la solicitud en estado `pendiente` con el estudiante de la sesión, el tutor, la materia, el bloque, la fecha y hora de la tutoría, el método de pago y el mensaje. Muestra "Solicitud enviada. Está pendiente de respuesta del tutor." y lleva a "Mis tutorías". — comprobado: 201 `pendiente` con `estudiante_id` de la sesión, `tutor_id`, `disponibilidad_id`, `fecha_hora_solicitud` del bloque, `metodo_pago` y mensaje recortado. El mensaje de éxito y el paso a "Mis tutorías" están implementados; la parte visual queda en la prueba en el navegador.
- [x] El sistema notifica al tutor con un correo a su cuenta institucional: quién solicita, la materia, el día y la hora, el método de pago, el mensaje y un enlace a "Solicitudes recibidas". El envío es asíncrono; si falla, la solicitud se crea igual y el error queda en el log sin datos personales. — comprobado con un SMTP local: llega a la cuenta del tutor con estudiante, materia, día y hora, método de pago, mensaje y enlace a "Solicitudes recibidas". Con el SMTP apagado, la solicitud se crea igual (201) y el log solo dice `… (solicitud 41): ESOCKET`.
- [x] Mientras está `pendiente`, el bloque deja de aparecer como libre en el calendario público, de modo que nadie más lo solicita. — comprobado: el bloque desaparece del calendario público y otro estudiante recibe 409 al pedirlo.
- [x] No se puede solicitar: — comprobados los 4 casos (bloque pendiente, inactivo, pasado o inexistente → 409; uno mismo o sin materias aprobadas → 404; materia no ofrecida → 400; choque de horario → 409), sin crear filas. El aviso "Este horario ya no está disponible" y la recarga del calendario están implementados; la parte visual queda en la prueba en el navegador.
  - Un bloque que ya no está libre (tiene una solicitud `pendiente` o `aceptada`, fue quitado o ya pasó): 409 `HORARIO_NO_DISPONIBLE`. La pantalla dice "Este horario ya no está disponible" y recarga el calendario.
  - Al propio usuario, o a alguien que no es tutor verificado: 404 `TUTOR_NO_ENCONTRADO`, como en 008.
  - Una materia que el tutor no tiene aprobada: 400 `MATERIA_NO_OFRECIDA`.
  - Si el estudiante ya tiene otra solicitud `pendiente` o `aceptada` que empieza a la misma hora: 409 `CHOQUE_DE_HORARIO`.
- [x] Si dos estudiantes piden el mismo bloque a la vez, solo una solicitud se crea; la otra recibe `HORARIO_NO_DISPONIBLE`. — comprobado: dos `POST` simultáneos → 201 y 409, una sola fila (bloqueo `SELECT … FOR UPDATE`).

### 2. Aceptación del tutor
- [x] Un usuario con rol `tutor` ve en "Mi espacio de tutor" la entrada "Solicitudes recibidas", con un contador de solicitudes pendientes. La entrada abre `/dashboard/solicitudes-recibidas`. — implementado: entrada en "Mi espacio de tutor" con el contador del prototipo (`/recibidas/pendientes`, comprobado: cuenta las pendientes y excluye las vencidas). **Pendiente de verificar en el navegador.**
- [x] La pantalla lista las solicitudes recibidas, con pestañas "Todas", "Pendiente", "Aceptada" y "Rechazada". Cada fila muestra: — implementado (tabla en escritorio, tarjetas en móvil). Los datos y el orden (pendientes primero) están comprobados con curl. **Pendiente de verificar en el navegador.**
  - El estudiante (nombre).
  - La materia y el horario (día, hora de inicio y fin).
  - El método de pago y el mensaje.
  - El estado con su badge y la fecha de envío.
  - Las pendientes, en primer lugar, con los botones "Aceptar" y "Rechazar".
- [x] Al aceptar, la solicitud pasa a `aceptada`, el bloque queda como "Con tutoría confirmada" en "Mi disponibilidad" y ya no se puede quitar (409 de 009). El tutor ve "Solicitud aceptada. El estudiante recibirá una notificación." y el estudiante recibe un correo de confirmación. — comprobado: `aceptada` con `respondido_en`, el bloque pasa a `confirmado` y quitarlo da 409, y el correo de confirmación llega al estudiante. El mensaje "Solicitud aceptada…" está implementado; la parte visual queda en la prueba en el navegador.
- [x] Una vez aceptada, el tutor ve el correo institucional del estudiante y el estudiante ve el del tutor, para coordinar la sesión. Antes de aceptar no se muestran. — comprobado: `correo` aparece para ambos solo en las aceptadas; en las pendientes y rechazadas es `null`.
- [x] No se puede aceptar una solicitud de otro tutor (404 `SOLICITUD_NO_ENCONTRADA`), una que ya no está `pendiente` (409 `SOLICITUD_YA_RESPONDIDA`) ni una cuyo horario ya pasó (409 `SOLICITUD_VENCIDA`). — comprobado: otro tutor o un id inexistente → el mismo 404; ya respondida → 409; vencida → 409 `SOLICITUD_VENCIDA` (una vencida sí se puede rechazar).

### 3. Rechazo del tutor
- [x] Al pulsar "Rechazar" se pide confirmación dentro de la página, con un motivo opcional (hasta 300 caracteres). — implementado en `modal-rechazar.jsx` (motivo opcional con contador de 300, "Confirmar rechazo"); el servidor rechaza un motivo de 301 caracteres. **Pendiente de verificar en el navegador.**
- [x] Al confirmar, la solicitud pasa a `rechazada`, el bloque vuelve a estar libre en el calendario público y otro estudiante lo puede solicitar. — comprobado: `rechazada` con el motivo, el bloque vuelve al calendario público y a `disponible`, y otra estudiante lo solicita (201).
- [x] El sistema notifica al estudiante con un correo que indica el tutor, la materia, el horario y el motivo si lo hay. — comprobado con el SMTP local: el correo lleva tutor, materia, "miércoles 11 de noviembre a la 1:00 p. m. – 2:00 p. m." y el motivo.
- [x] Las mismas reglas de la aceptación: solo el tutor de la solicitud y solo si sigue `pendiente`. — comprobado: rechazar una ya respondida → 409, y un tutor que no es el de la solicitud → 404.

### Mis tutorías (estudiante)
- [x] La entrada "Mis tutorías" deja de ser un placeholder. Lista las solicitudes que hizo el usuario, con pestañas "Todas", "Pendiente", "Aceptada" y "Rechazada". Cada fila muestra el tutor, la materia, el horario, el método de pago, el estado y, si fue rechazada, el motivo. — implementado: ruta real, pestañas en la URL y filas con fecha, tutor (enlace al perfil), horario, pago, badge, correo del tutor si fue aceptada y motivo si fue rechazada. Los datos están comprobados con curl. **Pendiente de verificar en el navegador.**
- [x] Estados de carga, de error con "Reintentar" y vacío ("Aún no has solicitado tutorías", con un botón "Buscar tutor"). — implementado. **Pendiente de verificar en el navegador.**

### Disponibilidad (cambio en 009)
- [x] En "Mi disponibilidad", un bloque con una solicitud `pendiente` se muestra como "Con solicitud pendiente", con su propio color. No se puede quitar mientras la solicitud no se responda: la pantalla lo avisa y el backend responde 409 `BLOQUE_CON_SOLICITUD_PENDIENTE`. — comprobado: `obtenerMiSemana` devuelve `pendiente` y quitarlo da 409 `BLOQUE_CON_SOLICITUD_PENDIENTE`. La pantalla lo pinta en ámbar como "Con solicitud pendiente", no lo cambia y avisa; la parte visual queda en la prueba en el navegador. Aquí también se corrigió un fallo de 009: la pantalla no enviaba los bloques retenidos al guardar.

### Datos y seguridad
- [x] El `estudianteId` sale siempre de la sesión. El `tutorId`, la fecha y la hora salen del bloque, nunca del cuerpo. — comprobado: el cuerpo solo acepta `disponibilidadId`, `materiaId`, `metodoPago` y `mensaje`; en la BD el estudiante es el de la sesión y el tutor, la fecha y la hora salen del bloque.
- [x] Crear y consultar las propias solicitudes lo pueden hacer los roles `estudiante` y `tutor`. Responder y ver las recibidas, solo el rol `tutor` y solo las suyas. El administrador recibe 403 `ACCESO_DENEGADO`. — comprobado: 401 sin sesión, 403 al administrador en las 6 rutas y al estudiante en las 4 de tutor; Bruno solo ve las suyas.
- [x] El cuerpo se valida con Zod (ids enteros positivos, método de pago del catálogo, mensaje de hasta 500 caracteres y motivo de hasta 300, recortados). Los inválidos devuelven el 400 de Zod. — comprobado: ids inválidos, método `bitcoin`, mensaje de 501 caracteres, falta de materia y `?estado=otro` → 400 de Zod; motivo de 301 caracteres rechazado por el esquema; textos recortados y vacíos tratados como ausentes.
- [x] Ninguna respuesta expone cédulas, certificados ni solicitudes de otros usuarios. Los correos institucionales solo se muestran en las tutorías aceptadas entre esas dos personas. Los correos de notificación no incluyen más datos que los necesarios. — comprobado: las recibidas no traen el id del estudiante y las enviadas solo `tutor.id` (para enlazar el perfil); sin cédulas ni certificados; los correos de notificación solo llevan los datos de la tutoría y los asuntos ningún dato personal.
- [x] Las pantallas siguen el prototipo `Saber-Compartido-Dashboard` (modal "Solicitar una tutoría", vista "Solicitudes recibidas" y vista "Mis tutorías"), son usables en móvil y respetan los tokens visuales del tech-stack. — implementado según el mapeo anotado en tasks.md. **Pendiente de verificar en el navegador.**
- [x] Lint sin errores y sin dependencias nuevas que no estén justificadas en el plan. — backend y frontend sin errores (solo warnings previos); sin dependencias nuevas. `vite build` avisa de que el bundle pasó los 500 kB (503 kB, 141 kB con gzip).

## Fuera de alcance

- Procesar pagos o mostrar precios. Solo se registra el método preferido.
- Que el tutor configure qué métodos de pago acepta. Por ahora el catálogo es fijo.
- Cancelar o reprogramar una solicitud, por parte del estudiante o del tutor (estado `cancelada`).
- Marcar tutorías como `completada` y calificarlas (CAL-TUT-001).
- Notificaciones dentro de la app (la campana y el drawer de DAS-EST-004) y avisos en tiempo real. Aquí se notifica por correo y con el contador de la entrada "Solicitudes recibidas".
- Vencer automáticamente las solicitudes pendientes cuyo horario pasó: se muestran como vencidas y no se pueden aceptar, pero no cambian de estado.
- Modalidad (presencial / en línea), lugar y enlace de la reunión.
- Tutorías grupales (GRU-*).
- Resumen de próximas tutorías en el dashboard (DAS-EST-003).
