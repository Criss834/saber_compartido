# Plan · 009 Disponibilidad del tutor

## Enfoque

La tabla `disponibilidad_tutores` ya existe desde `001_schema_inicial.sql`: `tutor_id`, `fecha` (DATE), `hora_inicio` y `hora_fin` (TIME), `activo` y el índice `idx_disponibilidad_tutor_dia`. El tech-stack la define como **bloques concretos, no recurrentes**. Cada bloque del calendario es una fila de una hora (`fecha` + `hora_inicio`, con `hora_fin` una hora después). No hace falta cambiar el esquema.

La referencia visual es la vista "Mi disponibilidad" del prototipo `Saber-Compartido-Dashboard`:
- Calendario de lunes a sábado con 11 bloques por día (8, 9, 10, 11, 12, 1, 2, 3, 4, 5 y 6).
- Estados `slot-open` (disponible), `slot-booked` (con tutoría confirmada) y `slot-closed` (no disponible).
- Leyenda, aviso de bloques confirmados y paneles "Resumen de la semana" y "Cómo funciona".

El prototipo muestra una sola semana genérica. Aquí cada semana tiene fechas reales y se navega entre la actual y las 3 siguientes. Se replica en React con los tokens existentes, sin copiar su código.

**Guardado por semana.** El frontend envía la lista completa de bloques marcados de la semana que se está viendo. El backend calcula la diferencia con lo guardado y la aplica en una transacción: crea los nuevos, quita los desmarcados y rechaza todo el envío si alguno de los quitados tiene una tutoría confirmada. Así "agregar, editar o eliminar" (criterio 2) es un solo flujo: editar un bloque es quitar uno y marcar otro, y el criterio 3 se cumple en el servidor aunque el frontend falle.

El calendario público se integra en el perfil del tutor de 008, que ya aplica las reglas de visibilidad (tutor aprobado y distinto del usuario).

## Implementación

1. **Revisar el esquema.** Confirmar en la BD la estructura real de `disponibilidad_tutores` y de `solicitudes_tutoria.disponibilidad_id` (si es `UNIQUE` o solo índice; el tech-stack dice `UNIQUE` y `schema.prisma` muestra `@@index`). Confirmar también cómo devuelve Prisma las columnas `@db.Date` y `@db.Time` (como `DateTime` en UTC). El comentario de `fecha` ("0=Domingo ... 6=Sábado") es un resto del diseño inicial: la columna es `DATE` y se usa como fecha. No se espera cambiar el esquema; si hiciera falta un índice único `(tutor_id, fecha, hora_inicio)`, va en `database/007_*.sql` y se regenera con `prisma db pull`, sin migraciones.

2. **Constantes y fechas.** `backend/src/modules/disponibilidad/disponibilidad.constantes.js`:
   - Horas permitidas `["08:00", …, "12:00", "14:00", …, "18:00"]` y duración de 60 minutos.
   - Días de lunes a sábado.
   - Ventana de 4 semanas.
   - Zona `America/Bogota`.

   Funciones puras para obtener la fecha y la hora actuales en Colombia, el lunes de una semana, convertir `fecha`/`hora` de Prisma a `"YYYY-MM-DD"` y `"HH:MM"` con los getters UTC, y al revés.

3. **Validación.** `disponibilidad.schema.js` con Zod 4:
   - `PUT` → `{ semana: "YYYY-MM-DD" (lunes), bloques: [{ fecha, horaInicio }] }`, como máximo 60 bloques.
   - `GET /mia` → `?semana=` opcional.
   - `id` del tutor como entero positivo.

   Las reglas que dependen de la fecha actual van en el service y responden 400 propio:
   - `fecha` dentro de la semana enviada y de lunes a sábado.
   - Semana dentro de la ventana.
   - Bloque no pasado.
   - Sin duplicados.

4. **Repository.** `disponibilidad.repository.js`:
   - Bloques activos de un tutor entre dos fechas, cada uno con un indicador de si tiene una solicitud `aceptada`.
   - Bloques libres y futuros de un tutor en la ventana (activos y sin `aceptada`), para el calendario público.
   - Crear, reactivar (`activo = true` si el bloque ya existía inactivo), borrar y desactivar bloques dentro de una transacción.

5. **Service.** `disponibilidad.service.js`:
   - `obtenerMiSemana(tutorId, semana)`: los 60 bloques de la semana con estado `disponible`, `confirmado`, `no_disponible` o `pasado`.
   - `guardarMiSemana(tutorId, semana, bloques)`, en una transacción:
     - Calcula qué bloques se agregan y cuáles se quitan respecto a lo guardado.
     - Si algún bloque quitado tiene una tutoría `aceptada`, lanza 409 `BLOQUE_CON_TUTORIA_CONFIRMADA` e indica la fecha y la hora.
     - Los quitados sin ninguna solicitud se borran; los que tienen solicitudes (pendientes o históricas) se desactivan, porque la FK `fk_st_disponibilidad` no permite borrarlos.
     - Los bloques pasados de la semana no se tocan.
     - Devuelve la semana actualizada.
   - `obtenerDisponibilidadPublica(usuarioId, tutorId)`:
     - Primero aplica la regla del perfil de 008, reutilizando la consulta de `busqueda.repository.js` (404 `TUTOR_NO_ENCONTRADO` uniforme).
     - Después devuelve `{ bloques: [{ fecha, horaInicio, horaFin }] }`, solo con los bloques libres y futuros de la ventana.

6. **Controller y rutas.** `disponibilidad.controller.js` y `disponibilidad.routes.js`, todas con `requerir-sesion`:
   - `GET /api/disponibilidad/mia?semana=` y `PUT /api/disponibilidad/mia`, con `requerirRol("tutor")`.
   - `GET /api/disponibilidad/tutores/:id`, con `requerirRol("estudiante", "tutor")`.

   Montar el router en `backend/src/app.js` como `/api/disponibilidad`.

7. **Cliente HTTP del frontend.** `frontend/src/features/disponibilidad/api-disponibilidad.js`, con el patrón de `api-busqueda.js`: `credentials: "same-origin"` y manejo del 401.

8. **Estudiar el prototipo.** Leer `availabilityView` y los estilos `.calendar-grid`, `.calendar-day`, `.slot-*`, `.legend` y `.callout.warning` del prototipo, y mapearlos a los tokens de `index.css`.

9. **Calendario semanal reutilizable.** `frontend/src/features/disponibilidad/calendario-semanal.jsx` con dos modos:
   - **Edición** (tutor): botones que cambian de estado; el bloque confirmado no cambia y avisa; el pasado está deshabilitado.
   - **Lectura** (perfil público): solo muestra los bloques libres.

   Incluye la navegación de semanas (anterior y siguiente, limitada a la ventana), el encabezado con el rango de fechas y la leyenda. Usa 6 columnas en escritorio y 3 en móvil. Las fechas se formatean con `Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota" })`.

10. **Pantalla "Mi disponibilidad".** `frontend/src/pages/Dashboard/MiDisponibilidad.jsx`:
    - Encabezado de página con "Guardar disponibilidad".
    - Calendario en modo edición.
    - Aviso de bloques confirmados.
    - Panel "Resumen de la semana" con los contadores y "Guardar cambios".
    - Panel "Cómo funciona".
    - Estados de carga, error con "Reintentar", guardado y confirmación.
    - Aviso de cambios sin guardar al cambiar de semana, con "Guardar" y "Descartar" dentro de la página.
    - Ante un 409, se muestra el mensaje y se recarga la semana.

11. **Calendario público en el perfil.** En `PerfilTutor.jsx`, un panel "Disponibilidad" con el calendario en modo lectura, que se abre en la primera semana con bloques, o el mensaje "Este tutor no tiene horarios disponibles por el momento". Carga y error propios, de modo que si falla la disponibilidad el resto del perfil se sigue viendo.

12. **Navegación y rutas.**
    - En `navegacion.js`, `gruposDeRol("tutor")` añade a los grupos del estudiante un grupo "Mi espacio de tutor" con "Mi disponibilidad" (icono de reloj, ruta `/dashboard/mi-disponibilidad`).
    - En `App.jsx` se registra la ruta dentro de `RutaPorRol rolesPermitidos={["tutor"]}`.
    - Se comprueba que el rol del contexto de sesión se actualiza tras la aprobación del administrador (o al volver a cargar `/yo`).

13. **Validación.** Sin framework de tests:
    - curl (`127.0.0.1:3000`) y navegador.
    - Datos de prueba desechables `prueba009.*`, con una solicitud `aceptada` insertada directamente para simular una tutoría confirmada, porque SOL-TUT-001 aún no existe.
    - `npx oxlint src` en el backend y `npm run lint` en el frontend.
    - Comparación visual con el prototipo en escritorio y en móvil.

## Decisiones

- **Bloques concretos de una hora**, no recurrentes, como fija el tech-stack y la tabla existente. Se corresponde con la cuadrícula del prototipo y con la futura `solicitudes_tutoria.disponibilidad_id`, que apunta a un horario exacto.
- **Horas fijas del prototipo** (8–12 y 2–6, lunes a sábado). Simplifican la validación y la UI; los horarios libres quedan fuera de alcance.
- **Ventana de 4 semanas** (la actual y 3 más). Es suficiente para planificar tutorías sin manejar meses enteros.
- **Guardado por semana con diferencia en el servidor.** Un único `PUT` por semana, idempotente y en una transacción: o se aplica todo o nada. Evita un endpoint por bloque y mantiene el botón "Guardar" del prototipo.
- **El bloque confirmado se protege en el backend**, no solo en la UI: 409 `BLOQUE_CON_TUTORIA_CONFIRMADA` y nada guardado.
- **"Confirmada" = solicitud `aceptada`.** Las `pendiente` no bloquean el cambio en esta feature, porque el flujo de solicitudes es de SOL-TUT-001, que decidirá qué pasa con ellas. El bloque con solicitudes se desactiva en vez de borrarse para respetar la FK.
- **Rol `tutor` para editar.** Usa el `requerirRol` de 007, que consulta el rol actual en la BD; el estudiante aprobado pasa a `tutor` al aprobarse su primera materia.
- **Calendario público dentro del perfil de 008**, reutilizando su regla de visibilidad y su 404 uniforme. No se crea otra página.
- **Fechas como texto `YYYY-MM-DD` y `HH:MM` en la API**, y conversión con getters UTC en el backend, para que la zona horaria del servidor (Railway en UTC, local en Colombia) no mueva los bloques.
- **Sin dependencias nuevas.** Las fechas se manejan con `Intl` y aritmética de días, sin librería de calendario.

## Riesgos

- **Zona horaria y tipos `DATE`/`TIME` de Prisma.** Prisma devuelve `DATE` y `TIME` como `DateTime` en UTC; usar getters locales correría los bloques un día o 5 horas. Las funciones del paso 2 lo encapsulan y se prueban con un bloque a las 6:00 p. m. y uno en domingo/lunes.
- **"Hoy" en el servidor.** El bloque pasado se calcula con la hora de Colombia, no con la del servidor.
- **Duplicados sin índice único.** Sin `UNIQUE (tutor_id, fecha, hora_inicio)`, dos guardados simultáneos podrían duplicar un bloque. Se mitiga calculando la diferencia dentro de la transacción; si se observa en pruebas, se añade el índice en un script numerado.
- **`disponibilidad_id` `UNIQUE` en `solicitudes_tutoria`.** Ya está anotado en el tech-stack para SOL-TUT-001. Aquí solo afecta a los datos de prueba (una solicitud por bloque).
- **Rol en el frontend desactualizado.** Si el contexto de sesión guarda el rol del login, un estudiante aprobado no vería "Mi disponibilidad" hasta volver a entrar. El paso 12 lo comprueba.
- **Sin flujo real de solicitudes.** El criterio 3 se prueba con una solicitud `aceptada` insertada a mano, que se borra al cerrar.
- **Plazo.** SOL-TUT-001 depende de esta feature y la fecha límite es el 11 de noviembre. El panel público del perfil es lo último y se puede simplificar a una lista de bloques si el tiempo aprieta.
