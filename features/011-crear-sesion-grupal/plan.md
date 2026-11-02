# Plan · 011 Crear sesión grupal

## Enfoque

La tabla `sesiones_grupales` existe desde `001_schema_inicial.sql`:
- Campos: `tutor_id`, `materia_id`, `titulo`, `descripcion`, `fecha_hora_sesion` (DATETIME), `cupo` (SMALLINT) y `estado` (`abierta` | `llena` | `cancelada` | `completada`).
- La acompaña `inscripciones_sesion_grupal`, con `UNIQUE (sesion_grupal_id, estudiante_id)`.
- Las dos están vacías.

Solo falta la **duración**, que pide el prototipo y que hace falta para saber cuándo termina la sesión y detectar choques de horario. Se añade con un script numerado.

**Mismas convenciones que la 009 y la 010:**
- `fecha_hora_sesion` guarda la hora de Colombia con la convención UTC, se escribe con `fechaHoraABd` y se lee con getters UTC.
- "Ahora" se calcula con `ahoraEnColombia()`.
- Ventana de 4 semanas.
- El tutor se identifica con la sesión iniciada y se exige `requerirRol("tutor")`.

**La agenda del tutor es una sola.** Una sesión grupal no puede cruzarse con nada de lo que el tutor ya ofreció o comprometió: otras sesiones grupales vivas, tutorías individuales vivas (como tutor o como estudiante) y bloques publicados en "Mi disponibilidad". Para no tocar los bloques sin que el tutor lo sepa, el choque con disponibilidad se rechaza con un mensaje que indica quitar esos bloques primero. En sentido contrario, la 009 deja de aceptar bloques que se crucen con una sesión grupal viva y los muestra como "Sesión grupal".

**Pantallas** (referencia: el prototipo `Saber-Compartido-Dashboard`, sin copiar su código ni sus datos):
- **Tutor:** `groupCreateView`, con el formulario "Nueva sesión grupal" y los paneles "Antes de publicar" y "Mis sesiones publicadas".
- **Estudiante:** `groupsView`, con las tarjetas de sesión, la barra de ocupación y "Inscribirme". Aquí "Inscribirme" va deshabilitado hasta la 012, igual que "Solicitar" en la 008.

## Implementación

1. **Esquema.** Crear `database/008_sesion_grupal_duracion.sql`:
   - `ALTER TABLE sesiones_grupales ADD COLUMN duracion_minutos SMALLINT UNSIGNED NOT NULL DEFAULT 90 AFTER fecha_hora_sesion`.
   - Ejecutarlo en Docker y regenerar con `prisma db pull` y `prisma generate`, con el campo `duracionMinutos` y su `@map`.
   - La 013 pasa a usar el script 009.

2. **Módulo `backend/src/modules/tutorias-grupales/`** (nombre del tech-stack), con el patrón routes → validar → controller → service → repository.
   - `tutorias-grupales.constantes.js`:
     - Duraciones `[60, 90, 120]`.
     - Cupo de 2 a 30.
     - Horas de inicio de 07:00 a 20:00 cada 30 minutos.
     - Fin máximo a las 21:00.
     - Título de 5 a 150 caracteres y descripción de hasta 1000.
     - Estados vivos: `abierta` y `llena`.
   - `tutorias-grupales.schema.js` (Zod 4). Crear: `{ titulo, materiaId, fecha, horaInicio, duracionMinutos, cupo, descripcion? }`, con los textos recortados y la descripción vacía tratada como ausente.

3. **Repository.**
   - Materias aprobadas del tutor.
   - Sesiones vivas del tutor en un día.
   - Solicitudes vivas del tutor ese día, como tutor y como estudiante, con su bloque.
   - Bloques activos del tutor ese día.
   - Crear la sesión.
   - Listar las sesiones del tutor y las sesiones públicas (abiertas y futuras, de tutores visibles, sin las del usuario), cada una con su materia, el tutor (id y nombre) y el número de inscripciones `confirmada`.
   - Sesiones vivas de un tutor entre dos fechas, para la 009.

4. **Service.**
   - `crearSesion(tutorId, datos)`:
     - Valida la materia aprobada (400 `MATERIA_NO_OFRECIDA`).
     - Valida que el horario sea futuro, esté dentro de la ventana y cumpla las reglas de hora y duración (400 `HORARIO_INVALIDO`).
     - Calcula el intervalo `[inicio, fin)` y lo compara con las sesiones vivas, las solicitudes vivas y los bloques activos de ese día. Con el primer choque responde 409 `CHOQUE_DE_HORARIO`, con un mensaje que explica con qué choca y a qué hora.
     - Inserta la sesión `abierta`.
     - Todo dentro de una transacción con `SELECT … FOR UPDATE` sobre la fila del tutor en `usuarios`. Así dos publicaciones simultáneas del mismo tutor no se cruzan entre sí.
   - `listarMisSesiones(tutorId)` y `listarSesionesPublicas(usuarioId)` devuelven:
     - `id`, `titulo`, `descripcion` y `materia`.
     - `fecha`, `horaInicio`, `horaFin` y `duracionMinutos`.
     - `cupo`, `inscritos`, `disponibles` y `estado`.
     - `pasada`.
     - `tutor { id, nombreCompleto }`, solo en las públicas.
   - Orden: las próximas primero, por fecha; en las del tutor, luego las pasadas, de la más reciente a la más antigua.

5. **Rutas.** Todas con `requerir-sesion`; montar el router en `backend/src/app.js` como `/api/sesiones-grupales`.
   - `POST /api/sesiones-grupales`, `GET /api/sesiones-grupales/mias` y `GET /api/sesiones-grupales/materias` (las materias aprobadas, para el formulario): `requerirRol("tutor")`.
   - `GET /api/sesiones-grupales`: `requerirRol("estudiante", "tutor")`.

6. **Ajustes en la 009.**
   - `obtenerMiSemana` marca como `sesion_grupal` las horas que se cruzan con una sesión viva del tutor.
   - `guardarMiSemana` rechaza agregar esos bloques con 400 `BLOQUE_INVALIDO`.
   - `obtenerDisponibilidadPublica` excluye los bloques que se cruzan, por si existieran de antes.
   - En el frontend, el calendario pinta el estado nuevo ("Sesión grupal"), no deja cambiarlo y la leyenda lo explica. Al guardar, el frontend no lo envía.

7. **Cliente HTTP y constantes del frontend.** `frontend/src/features/tutorias-grupales/api-tutorias-grupales.js` (crear, mías, públicas y materias, con manejo del 401) y `constantes.js` (duraciones, cupo, horas de inicio y etiquetas y tonos de estado).

8. **"Sesiones grupales" del tutor.** `pages/Dashboard/SesionesGrupales.jsx`:
   - Encabezado de página.
   - Formulario `formulario-sesion-grupal.jsx`:
     - Selects de materia, hora y duración, la fecha con `min` y `max`, el cupo numérico y la descripción con contador.
     - Validación en el cliente.
     - "Limpiar" y "Publicar sesión" con estado de envío.
     - Errores del servidor (los 409 y 400) en un aviso junto al formulario.
   - Panel "Antes de publicar" con el texto del prototipo.
   - Panel "Mis sesiones publicadas", con fila de fecha, cupos y badge de estado, y su vacío.
   - Ruta dentro de `RutaPorRol(["tutor"])` y entrada en "Mi espacio de tutor".

9. **"Tutorías grupales" del estudiante.** `pages/Dashboard/TutoriasGrupales.jsx`:
   - Rejilla de `tarjeta-sesion-grupal.jsx` (2 columnas, 1 en móvil), con el icono, el nombre, la materia, el badge "Cupos abiertos", el tutor con enlace a su perfil, la fecha y la duración, la barra "Ocupación N / M cupos", la descripción y "Inscribirme" deshabilitado con "Próximamente".
   - Estados de carga, error y vacío.
   - La entrada de `navegacion.js` pasa a implementada.

10. **Validación.** Sin framework de tests:
    - Script HTTP en el scratchpad con datos desechables `prueba011.*`. Esta feature no envía correos.
    - Casos de choque contra sesiones, solicitudes y bloques, en los bordes de los intervalos (una sesión que termina justo cuando empieza otra no choca).
    - Volver a pasar las baterías de la 009 y la 010.
    - `npx oxlint src` y `npm run lint`.
    - Revisión en el navegador frente al prototipo.

## Decisiones

- **Duración como columna nueva**, con valores fijos de 60, 90 o 120 minutos como en el prototipo. Sin ella no se puede mostrar la hora de fin ni detectar choques.
- **Horas cada 30 minutos de 7:00 a. m. a 8:00 p. m.**, distintas de los bloques de una hora de la 009. Una sesión grupal no es un bloque de disponibilidad: el tutor elige libremente dentro de un horario razonable.
- **Una sola agenda por tutor.** Se rechaza cualquier cruce con sesiones, tutorías individuales y bloques publicados. El tutor resuelve el cruce con los bloques en "Mi disponibilidad" en vez de que el sistema los quite por su cuenta.
- **Bloqueo por tutor** (`FOR UPDATE` sobre su fila de `usuarios`) para que dos publicaciones simultáneas no se crucen, el mismo patrón de la 010.
- **"Tutorías grupales" ya muestra las sesiones** aunque la inscripción llegue en la 012, para cumplir "el sistema publica la sesión como disponible para inscripción" de forma visible.
- **Ventana de 4 semanas**, la misma de la 009, para no manejar calendarios distintos.
- **Cupos ocupados calculados** contando las inscripciones `confirmada` (hoy 0), como indica el tech-stack. El paso a `llena` es de la 012.
- **Sin editar ni cancelar en esta feature**, para mantener el alcance de la HU; queda en el backlog.
- **Sin dependencias nuevas.**

## Riesgos

- **Cambio de esquema.** Una columna con valor por defecto en una tabla vacía. Hay que coordinarlo y ejecutarlo en Aiven al desplegar, antes del script de la 013.
- **Choques con intervalos de distinto tamaño.** Las sesiones duran de 60 a 120 minutos y empiezan cada media hora; los bloques y las tutorías duran una hora en punto. La comparación se hace con minutos desde la medianoche del mismo día (`inicio < finOtro && inicioOtro < fin`) y se prueba en los bordes.
- **Cambio de comportamiento en la 009.** Las horas con sesión grupal dejan de ser marcables. Hay que volver a pasar su batería.
- **Zona horaria.** Igual que en la 009 y la 010: `DATETIME` en hora de Colombia con la convención UTC.
- **Plazo** (11 de noviembre). Si aprieta, se cortan en este orden: la vista de tarjetas de "Tutorías grupales" (una lista simple), el estado "Sesión grupal" en el calendario de "Mi disponibilidad" (se mantiene la validación del backend) y la ordenación de las pasadas.
