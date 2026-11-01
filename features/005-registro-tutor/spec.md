# 006 · Registro de tutor

## Qué hace

Permite que un estudiante con sesión iniciada solicite ser tutor desde la entrada "Ser tutor" del espacio académico. En un formulario elige una o más materias del catálogo, indica su promedio en cada una, adjunta el certificado de notas que respalda esos promedios y, opcionalmente, cuenta cómo puede ayudar. Su programa académico se muestra fijo como "Tecnología en Desarrollo de Software". Al enviarlo, queda registrada una solicitud en estado `pendiente` por cada materia, y la persona ve su estado en el panel "Estado de mi solicitud".

Quien ya envió solicitudes puede volver a "Ser tutor" para ver el estado de cada materia (`pendiente`, `aprobado`, `rechazado`) y solicitar otras materias.

## Por qué

La plataforma solo funciona si hay tutores. Los tutores son estudiantes de la UCLA que usan la misma cuenta, así que no se crea un registro nuevo: se amplía el perfil existente. Esta feature recoge los datos y el documento que la verificación (TUT-VER-001) necesita para decidir, y así el registro y la verificación se construyen y validan por separado.

## Criterios de aceptación

- [x] La ruta "Ser tutor" dentro de `/dashboard` solo es accesible con sesión iniciada; sin sesión redirige a `/iniciar-sesion`.
- [x] La entrada "Ser tutor" del sidebar deja de ser un placeholder y abre el formulario.
- [x] El formulario permite elegir de 1 a 5 materias del catálogo, sin repetir.
- [x] Por cada materia elegida se pide su promedio: número entre 4.00 y 5.00 (ambos incluidos), con máximo 2 decimales (acepta coma o punto).
- [x] El programa académico se muestra fijo como "Tecnología en Desarrollo de Software", sin posibilidad de cambiarlo, porque el MVP es de una sola carrera y la base de datos aún no gestiona programas. No se pide ni se valida como dato de entrada.
- [x] Se puede añadir una descripción opcional de hasta 500 caracteres, una sola vez por envío.
- [x] Se adjunta un único certificado de notas en PDF, JPG o PNG, de máximo 5 MB, que respalda todas las materias del envío.
- [x] El tipo del archivo se comprueba por su contenido real y no solo por su extensión o su tipo declarado.
- [x] El documento no es público: solo el backend puede leerlo (y, más adelante, la verificación).
- [x] Al enviar con datos válidos se crea una solicitud `pendiente` por materia, todas asociadas al usuario de la sesión y al mismo documento.
- [x] Si algo falla, no se guarda nada (todo o nada) y los datos escritos se conservan en el formulario.
- [x] El `usuarioId` sale siempre de la sesión, nunca del cuerpo de la petición.
- [x] El rol del usuario sigue siendo `estudiante` tras el registro; cambia a `tutor` solo cuando una materia se aprueba (fuera de esta feature).
- [x] Si alguna materia ya tiene una solicitud `pendiente` o `aprobado` del usuario, se rechaza el envío completo indicando cuáles. Si la anterior fue `rechazado`, se permite enviar una nueva y la solicitud vuelve a `pendiente`.
- [x] Un promedio menor que 4.00, mayor que 5.00 o con más de 2 decimales, una materia inexistente, un archivo de tipo o tamaño no permitido, o la ausencia del archivo muestran un error específico junto al campo correspondiente.
- [x] El panel "Estado de mi solicitud" lista las solicitudes del usuario con materia, fecha y estado, con estados de carga, error con "Reintentar" y vacío.
- [x] La pantalla sigue la estructura del prototipo `Saber-Compartido-Dashboard`: formulario a la izquierda y, a la derecha, los paneles "Antes de postularte" y "Estado de mi solicitud". El formulario funciona en móvil y respeta los tokens visuales del tech-stack.
- [x] Los errores siguen el contrato `{codigo, mensaje}` y el 400 de Zod `{mensaje, detalle}`.
- [x] Lint sin errores y sin dependencias nuevas que no estén justificadas en el plan.

## Fuera de alcance

- Verificación del documento con IA o por un administrador (TUT-VER-001), incluido el cambio de estado y de rol.
- "Modo tutor" / "Mis tutorías" y cualquier vista de tutor en el shell: aparecen cuando exista un tutor aprobado.
- Disponibilidad, precios o tipo de tutoría (personal/grupal).
- Perfil público del tutor, su calificación y el semestre.
- Programa académico editable o gestionado por la base de datos.
- Notificaciones por correo del resultado.
- Editar o eliminar una solicitud ya enviada, o reemplazar el certificado.
- Del prototipo: el selector "Vista del sistema", la búsqueda global, las notificaciones y los contadores de "Mis tutorías" y "Tutorías grupales".