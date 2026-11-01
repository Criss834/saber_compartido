# Plan · 008 Búsqueda de tutores

## Enfoque

La búsqueda es solo lectura: no añade tablas ni columnas. Se apoya en lo que ya dejaron 006 y 007: un tutor es un usuario con al menos una fila `aprobado` en `tutores_materias`, y las calificaciones salen de `calificaciones`. Se construye con el patrón routes → (validar) → controller → service → repository en un módulo nuevo, y en el frontend sobre el shell del dashboard y la entrada "Buscar tutores" de `navegacion.js`.

La referencia visual es la vista "Buscar tutores" del prototipo `Saber-Compartido-Dashboard` (título, buscador, filtros, tarjetas, estados vacíos y botón "Ver perfil"). Se replica en React con los tokens existentes, sin copiar su código ni sus datos de demostración.

El volumen del MVP es pequeño (decenas de tutores), así que el backend trae los candidatos que cumplen la búsqueda textual y la materia, calcula las calificaciones en una consulta agregada y aplica el filtro de calificación, el orden y el tope de 50 resultados en el service. Esto evita consultas complejas y se puede mover a SQL si el volumen crece.

El perfil público es la última parte de la feature y es independiente: si el plazo aprieta, se corta sin afectar a la búsqueda.

## Implementación

1. **Revisar el esquema.** Comprobar la estructura real de `calificaciones` y `solicitudes_tutoria` para decidir cómo se llega de una calificación a su tutor (probablemente por la solicitud) y qué columna guarda la puntuación. No se espera cambiar el esquema; si hiciera falta un índice para la consulta de calificaciones, va en un script numerado de `database/` y se regenera `schema.prisma` con `prisma db pull`, sin migraciones.

   **Conclusión (revisado):** no hace falta cambiar el esquema.
   - `calificaciones` tiene `tutor_id` directo (FK a `usuarios`, con índice `fk_cal_tutor`), así que el promedio y la cantidad salen con un `groupBy` por `tutorId`, sin pasar por `solicitudes_tutoria`. La puntuación está en `calificacion` (`TINYINT UNSIGNED`).
   - `solicitud_tutoria_id` y `sesion_grupal_id` son opcionales y cada uno es único por estudiante (`uq_calificacion_solicitud` y `uq_calificacion_sesion`). Ambos tipos de calificación cuentan para el tutor.
   - La BD no tiene un `CHECK` del rango 1–5. Eso se valida en el service de CAL-TUT-001; hoy no hay filas en `calificaciones` ni en `solicitudes_tutoria`.
   - La colación real de `usuarios.nombres`, `usuarios.apellidos` y `materias.nombre` es `utf8mb4_unicode_ci`, no `0900_ai_ci`. Ignora igualmente mayúsculas y tildes, comprobado con `contains` ("algoritmica" → "Algorítmica…", "ALGEBRA" → "Álgebra…").

2. **Validación de parámetros.** `backend/src/modules/busqueda/busqueda.schema.js` con Zod 4:
   - `q`: opcional, recortado, hasta 80 caracteres.
   - `materiaId`: opcional, entero positivo.
   - `filtro`: `todos`, `calificacion` (4.8 o más) o `promedio` (4.5 o más).
   - El `id` del perfil: entero positivo.

   Express 5 no permite reasignar `req.query`, así que se extiende `validar` (o se añade una variante junto a él en `backend/src/shared/middlewares/`) para validar la query y dejar el resultado donde el controller lo lea.

3. **Repository.** `busqueda.repository.js` encapsula Prisma:
   - Buscar tutores: usuarios, distintos del usuario de la sesión, con al menos una materia `aprobado`, devolviendo solo sus materias aprobadas con su promedio.
   - Texto: se divide en palabras y cada una debe coincidir con los nombres, los apellidos o el nombre de alguna materia aprobada. Con la colación `utf8mb4_unicode_ci` de esas columnas la coincidencia ya ignora mayúsculas y tildes.
   - Filtro por `materiaId`: solo tutores que tengan esa materia aprobada.
   - Calificación: una segunda consulta agregada por los ids encontrados, que devuelve promedio y cantidad por tutor, para evitar una consulta por tarjeta.
   - Descripción: la de la solicitud aprobada más reciente que la tenga.
   - Materias con al menos un tutor aprobado, para el filtro.
   - Perfil: un tutor por id con la misma regla (aprobado y no es el usuario), más su calificación.

4. **Service.** `busqueda.service.js`:
   - Une tutores y calificaciones.
   - Aplica `filtro`: "calificación 4.8 o más" excluye a los tutores sin calificaciones, y "promedio 4.5 o más" evalúa el promedio de la materia elegida o, si no hay materia, el de cualquiera de sus materias.
   - Ordena por calificación descendente (los que no tienen, al final) y, a igualdad, por promedio en la materia.
   - Limita a 50.
   - Compone la respuesta pública `{total, tutores}`: id, nombre completo, iniciales, calificación `{promedio, cantidad}`, descripción y materias `{id, nombre, promedio}`. No incluye correo, cédula, documentos ni estados de otras solicitudes.
   - El perfil responde 404 `TUTOR_NO_ENCONTRADO` igual si no existe, no tiene materias aprobadas o es el propio usuario.

5. **Controller y rutas.** `busqueda.controller.js` y `busqueda.routes.js`, todas con `requerir-sesion` y `requerirRol("estudiante", "tutor")` (el administrador recibe 403 `ACCESO_DENEGADO`, igual que en `/api/tutores/solicitudes`):
   - `GET /api/busqueda/tutores`.
   - `GET /api/busqueda/materias`.
   - `GET /api/busqueda/tutores/:id`.

   Montar el router en `backend/src/app.js` como `/api/busqueda`.

6. **Cliente HTTP del frontend.** `frontend/src/features/busqueda/api-busqueda.js` con el patrón de `api-resumen.js` (`credentials: "same-origin"`, 401 propio), con soporte para cancelar la petición anterior.

7. **Estudiar el prototipo.** Leer la vista "Buscar tutores" de `Saber-Compartido-Dashboard` (estructura de las tarjetas, filtros, textos, estados y colores) y mapearla a los tokens de `index.css`.

8. **Pantalla de búsqueda.** `frontend/src/pages/Dashboard/BuscarTutores.jsx` con:
   - Buscador y filtros de materia y calificación/promedio.
   - Encabezado con el número de tutores y el botón "Ser tutor".
   - Rejilla de tarjetas (`tarjeta-tutor.jsx`, que reutiliza `avatar.jsx`) con "Ver perfil" y "Solicitar" deshabilitado como "Próximamente".
   - Estados de carga, error con "Reintentar" y los tres vacíos del spec.

   El texto y los filtros viven en la URL (`useSearchParams`) como única fuente de verdad; el texto se envía con una pausa breve al escribir y se cancela la petición anterior. Una sola columna en móvil.

9. **Buscador de la barra superior.** En `topbar.jsx` se añade el campo de búsqueda: al enviarlo lleva a `/dashboard/buscar-tutores?q=...`. No se muestra al administrador, y en móvil se oculta porque la pantalla de búsqueda tiene el suyo.

10. **Enrutado.** La entrada "Buscar tutores" de `navegacion.js` pasa de placeholder a su ruta real, y en `App.jsx` se registran las rutas de búsqueda y de perfil dentro de `LayoutDashboard`, con la misma redirección del administrador que el resto de rutas de estudiante.

11. **Perfil público (cortable).** `frontend/src/pages/Dashboard/PerfilTutor.jsx` y la ruta `/dashboard/buscar-tutores/:id`, con nombre, verificado, programa, calificación, descripción y materias con su promedio, y estados de carga, error y "no encontrado". "Solicitar tutoría" aparece deshabilitado.

12. **Validación.** Sin framework de tests: curl (`127.0.0.1:3000`) y navegador, `npx oxlint src` en backend, `npm run lint` en frontend y comparación visual con el prototipo en escritorio y móvil.

## Decisiones

- **Módulo propio `busqueda`.** La búsqueda es lectura pública para estudiantes y el módulo `tutores` es del flujo de registro del propio tutor; mantenerlos separados evita mezclar permisos (por ejemplo, `/api/tutores/solicitudes` responde 403 al administrador).
- **Sin cambios de esquema.** Todo sale de tablas existentes, lo que reduce el riesgo en un plazo corto.
- **Filtro, orden y tope en el service.** Es más simple y legible que SQL con agregados, y suficiente para el volumen del MVP.
- **Búsqueda por palabras.** Cada palabra del texto debe coincidir con algún campo, de modo que "miguel cardenas" encuentra a un tutor aunque nombre y apellido estén en columnas distintas.
- **Colación de la BD (`utf8mb4_unicode_ci`, insensible a tildes y mayúsculas) para ignorar tildes y mayúsculas**, en vez de normalizar el texto en código.
- **Calificaciones en una consulta agregada**, no por tarjeta.
- **Endpoint propio de materias para el filtro**, para que solo aparezcan las que tienen tutores y no el catálogo completo de `GET /api/materias`.
- **Estado de la búsqueda en la URL.** Recargar o compartir el enlace conserva la búsqueda y evita estado duplicado.
- **Administrador bloqueado también en el backend.** La búsqueda es una vista de estudiante; `requerirRol("estudiante", "tutor")` sigue el mismo criterio de la 007 para `/api/tutores/solicitudes`, y no depende solo de la redirección del frontend.
- **404 uniforme en el perfil**, para no revelar si un id corresponde a un tutor no verificado o al propio usuario.
- **El programa es la constante del frontend** (`features/tutor/constantes.js`), igual que en 006, y no viaja por la API.
- **Perfil público al final y cortable.**

## Riesgos

- **Estructura de `calificaciones` no vista.** El paso 1 la resuelve antes de escribir el repository; si la calificación no se puede ligar al tutor sin un cambio de esquema, se añade en un script numerado.
- **Hoy casi no hay calificaciones.** El filtro "calificación 4.8 o más" devolverá vacío hasta que exista CAL-TUT-001. El estado vacío debe decirlo con claridad para no parecer un error.
- **Datos de prueba.** Para ver la búsqueda hacen falta tutores aprobados: se obtienen aprobando solicitudes desde la cuenta de administrador de 007 o con los datos de prueba existentes. Con la cuota de Gemini limitada, el administrador puede resolver sin esperar a la IA.
- **Descripción repetida por fila.** Como `descripcion` se guarda en cada fila del mismo envío, se toma la de la aprobada más reciente que la tenga; si el tutor tiene varias distintas, solo se muestra una.
- **Escala del filtrado en memoria.** Con cientos de tutores habría que pasar el filtro y el orden a SQL. No es un problema para el MVP.
- **Express 5 y `req.query`.** No se puede reasignar; el paso 2 lo contempla.
- **Exposición de nombres.** Cualquier usuario autenticado de la plataforma ve el nombre completo de los tutores. Es lo previsto por la historia (el perfil verificado es público) y se limita a usuarios con cuenta institucional.
- **Una materia aprobada y otra pendiente.** Solo se muestran las aprobadas; hay que probarlo para que una solicitud pendiente nunca aparezca.
- **Plazo.** Quedan DISP-TUT-001 y SOL-TUT-001 antes del 11 de noviembre, por eso el perfil es cortable y no se añaden paginación ni orden configurable.