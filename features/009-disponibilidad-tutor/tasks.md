# Tasks · 009 Disponibilidad del tutor

## Backend

### Esquema y utilidades
- [x] Revisar en la BD la estructura real de `disponibilidad_tutores` y de `solicitudes_tutoria.disponibilidad_id` (si es `UNIQUE` o índice) y cómo devuelve Prisma `@db.Date` y `@db.Time`. Si hace falta un índice único `(tutor_id, fecha, hora_inicio)`, crearlo en el siguiente script numerado (`database/007_*.sql`; el último es `006_catalogo_materias.sql`), ejecutarlo en Docker y regenerar con `prisma db pull` y `prisma generate`. Si no hace falta, dejar la conclusión anotada en el plan. — no hace falta: `disponibilidad_id` es solo índice (no `UNIQUE`), DATE llega a medianoche UTC y TIME como `1970-01-01THH:MM:SSZ`; conclusión en el plan. (`database/`, `backend/prisma/schema.prisma`)
- [x] Crear las constantes: horas permitidas (`08:00` a `18:00`, 11 por día), bloques de 60 minutos, lunes a sábado, ventana de 4 semanas y zona `America/Bogota`. (`backend/src/modules/disponibilidad/disponibilidad.constantes.js`)
- [x] Crear las funciones de fecha: fecha y hora actuales en Colombia, lunes de una semana, semanas válidas de la ventana, conversión de `fecha`/`hora` de Prisma a `"YYYY-MM-DD"`/`"HH:MM"` con getters UTC y al revés. (`backend/src/modules/disponibilidad/fechas.js`)
- [x] Crear el esquema Zod: `PUT` con `semana` (`YYYY-MM-DD`) y `bloques` (`[{fecha, horaInicio}]`, máximo 66, `horaInicio` dentro de las horas permitidas); `?semana=` opcional para `GET`; `id` del tutor entero positivo. (`backend/src/modules/disponibilidad/disponibilidad.schema.js`)

### Disponibilidad propia
- [x] Crear en el repository la consulta de los bloques activos de un tutor entre dos fechas, cada uno con un indicador de si tiene una solicitud `aceptada`. (`backend/src/modules/disponibilidad/disponibilidad.repository.js`)
- [x] Crear en el repository las escrituras dentro de una transacción: crear bloques, reactivar los inactivos que se vuelven a marcar, borrar los que no tienen solicitudes y desactivar (`activo = false`) los que sí tienen. (`backend/src/modules/disponibilidad/disponibilidad.repository.js`)
- [x] Crear `obtenerMiSemana(tutorId, semana)`: devuelve los 66 bloques de la semana (por defecto la actual) con estado `disponible`, `confirmado`, `no_disponible` o `pasado`, y las semanas navegables de la ventana. Si la semana está fuera de la ventana, responde 400 `SEMANA_FUERA_DE_RANGO`. (`backend/src/modules/disponibilidad/disponibilidad.service.js`)
- [x] Crear `guardarMiSemana(tutorId, semana, bloques)`: valida que la semana sea un lunes dentro de la ventana, que cada fecha sea de esa semana y de lunes a sábado, que no haya duplicados y que no haya bloques pasados (400 `BLOQUE_INVALIDO`). Calcula la diferencia con lo guardado y la aplica en una transacción; si algún bloque quitado tiene una solicitud `aceptada`, responde 409 `BLOQUE_CON_TUTORIA_CONFIRMADA` con la fecha y la hora, sin guardar nada. Los bloques pasados no se tocan. Devuelve la semana actualizada. (`backend/src/modules/disponibilidad/disponibilidad.service.js`)

### Calendario público
- [x] Crear en el repository la consulta de los bloques libres y futuros de un tutor en la ventana: activos y sin solicitud `aceptada`. (`backend/src/modules/disponibilidad/disponibilidad.repository.js`)
- [x] Crear `obtenerDisponibilidadPublica(usuarioId, tutorId)`: reutiliza la regla del perfil de 008 (404 `TUTOR_NO_ENCONTRADO` igual si el tutor no existe, no tiene materias aprobadas o es el propio usuario) y devuelve `{bloques: [{fecha, horaInicio, horaFin}]}` sin datos de estudiantes ni de solicitudes. (`backend/src/modules/disponibilidad/disponibilidad.service.js`, `backend/src/modules/busqueda/busqueda.repository.js`)

### Rutas
- [x] Crear el controller y las rutas `GET /api/disponibilidad/mia` y `PUT /api/disponibilidad/mia` con `requerir-sesion` y `requerirRol("tutor")`, y `GET /api/disponibilidad/tutores/:id` con `requerir-sesion` y `requerirRol("estudiante", "tutor")`, todas validadas con Zod. El `tutorId` propio sale de `req.usuarioId`. (`backend/src/modules/disponibilidad/disponibilidad.controller.js`, `backend/src/modules/disponibilidad/disponibilidad.routes.js`)
- [x] Montar el router en la app como `/api/disponibilidad`. (`backend/src/app.js`)
- [x] Confirmar que ninguna respuesta ni log expone estudiantes, solicitudes ni bloques de otro tutor. (`backend/src/modules/disponibilidad/`)

## Frontend

- [ ] Leer `availabilityView` y los estilos `.calendar-grid`, `.calendar-day`, `.slot-open`, `.slot-booked`, `.slot-closed`, `.legend` y `.callout.warning` del prototipo `Saber-Compartido-Dashboard`, y anotar la estructura, los textos y los colores, mapeándolos a los tokens de `index.css`. (`~/Escritorio/Saber-Compartido-Dashboard/`)
- [ ] Crear el cliente HTTP siguiendo `api-busqueda.js`: obtener y guardar mi semana y obtener la disponibilidad pública de un tutor, con manejo del 401 y de los errores `{codigo, mensaje}`. (`frontend/src/features/disponibilidad/api-disponibilidad.js`)
- [ ] Crear las constantes y el formato de fechas del frontend: días, horas con su etiqueta ("8:00", "2:00"…), rango de la semana ("3 – 8 nov 2026") con `Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota" })`. (`frontend/src/features/disponibilidad/formato.js`)
- [ ] Crear el calendario semanal reutilizable con modo edición (cambia disponible ↔ no disponible, el confirmado no cambia y avisa, el pasado está deshabilitado) y modo lectura (solo los bloques libres), con navegación de semanas limitada a la ventana, leyenda y 6 columnas en escritorio y 3 en móvil. (`frontend/src/features/disponibilidad/calendario-semanal.jsx`)
- [ ] Crear la pantalla "Mi disponibilidad": encabezado con "Guardar disponibilidad", calendario en modo edición, aviso de bloques confirmados, panel "Resumen de la semana" con los contadores y "Guardar cambios", panel "Cómo funciona", estados de carga y de error con "Reintentar", guardar deshabilitado sin cambios o mientras se guarda, confirmación "Disponibilidad guardada", aviso de cambios sin guardar al cambiar de semana (guardar o descartar) y, ante un 409, mostrar el mensaje y recargar la semana. (`frontend/src/pages/Dashboard/MiDisponibilidad.jsx`)
- [ ] Añadir "Mi disponibilidad" al sidebar solo para el rol `tutor`, en un grupo "Mi espacio de tutor", y registrar la ruta `/dashboard/mi-disponibilidad` dentro de `RutaPorRol rolesPermitidos={["tutor"]}`. Comprobar que el rol del contexto de sesión se actualiza después de la aprobación. (`frontend/src/features/dashboard/navegacion.js`, `frontend/src/App.jsx`)
- [ ] Añadir al perfil del tutor el panel "Disponibilidad" con el calendario en modo lectura, abierto en la primera semana con bloques, o el mensaje "Este tutor no tiene horarios disponibles por el momento", con carga y error propios que no afectan al resto del perfil. (`frontend/src/pages/Dashboard/PerfilTutor.jsx`)
- [ ] Verificar el diseño en móvil (3 columnas) y en escritorio. (`frontend/src/pages/Dashboard/MiDisponibilidad.jsx`, `frontend/src/pages/Dashboard/PerfilTutor.jsx`)

## Pruebas / validación

- [ ] Lint del backend: `npx oxlint src`. (`backend/`)
- [ ] Lint del frontend: `npm run lint`. (`frontend/`)
- [ ] Preparar datos de prueba desechables `prueba009.*`: un tutor con bloques, un tutor sin bloques y un estudiante, y una solicitud `aceptada` insertada a mano sobre un bloque para simular una tutoría confirmada. Script de limpieza para borrarlos al cerrar. (`database/`)
- [ ] Con curl (`127.0.0.1:3000`): sin sesión las rutas devuelven 401; un estudiante en `/mia` y el administrador en todas reciben 403 `ACCESO_DENEGADO`. (`backend/`)
- [ ] Con curl: guardar una semana con varios bloques, leerla de nuevo y comprobar fechas y horas exactas (incluido un bloque a las 6:00 p. m. y uno del lunes y otro del sábado) sin corrimientos por la zona horaria. (`backend/`)
- [ ] Con curl: agregar, quitar y cambiar bloques en guardados sucesivos, y comprobar que el calendario público refleja cada cambio. (`backend/`)
- [ ] Con curl: un envío que quita el bloque confirmado devuelve 409 `BLOQUE_CON_TUTORIA_CONFIRMADA` y no aplica ningún otro cambio del mismo envío. (`backend/`)
- [ ] Con curl: datos inválidos (semana que no es lunes, fuera de la ventana, fecha de otra semana, domingo, hora no permitida, bloque pasado, duplicados, más de 66 bloques) devuelven 400. (`backend/`)
- [ ] Con curl: el calendario público de un tutor sin bloques devuelve una lista vacía; no incluye bloques pasados ni confirmados; el propio usuario, un id inexistente y una cuenta sin materias aprobadas reciben el mismo 404. (`backend/`)
- [ ] Revisar las respuestas y confirmar que no contienen datos de estudiantes, solicitudes ni identificadores innecesarios. (`backend/`)
- [ ] En el navegador: el tutor marca, guarda y recarga; modifica bloques; intenta cambiar el confirmado; cambia de semana con cambios sin guardar; los bloques pasados están deshabilitados; carga, error con "Reintentar" y sesión expirada (401). Comparar con el prototipo en móvil y escritorio. (`frontend/`)
- [ ] En el navegador: un estudiante ve el calendario público en el perfil del tutor y el mensaje "Este tutor no tiene horarios disponibles por el momento" en un tutor sin bloques; no ve "Mi disponibilidad" en el sidebar y es redirigido si abre la ruta. (`frontend/`)
- [ ] Regresión: búsqueda y perfil de 008, registro de tutor, verificación del administrador, login, Google, logout y Resumen siguen funcionando. (`frontend/`, `backend/`)

## Cierre

- [ ] Borrar los datos de prueba `prueba009.*` con el script de limpieza. (`database/`)
- [ ] Revisar el diff completo y confirmar que no hay `console.log`, secretos ni datos de prueba. (`./`)
- [ ] Confirmar que `package.json` y el lock no cambian. (`backend/package.json`, `frontend/package.json`)

## Mantenimiento

- [ ] Mover 009 a "Hecho" en el roadmap y dejar SOL-TUT-001 como siguiente. (`constitution/roadmap.md`)
- [ ] Documentar en `tech-stack.md` el módulo `disponibilidad`, sus endpoints, los bloques de una hora y la ventana de 4 semanas, y corregir el comentario de `disponibilidad_tutores.fecha`. (`constitution/tech-stack.md`)
- [ ] Anotar para SOL-TUT-001: la solicitud debe apuntar a un bloque activo, libre y futuro; qué pasa con las solicitudes `pendiente` de un bloque que el tutor quita; y el `UNIQUE` de `disponibilidad_id`. (`constitution/roadmap.md`, `constitution/tech-stack.md`)
- [ ] Anotar en el backlog: disponibilidad recurrente, copiar semana, horarios libres, modalidad y lugar, más semanas de anticipación y el panel "Resumen de disponibilidad" del Resumen del tutor. (`constitution/roadmap.md`)
