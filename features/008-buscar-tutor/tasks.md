# Tasks · 008 Búsqueda de tutores

## Backend

### Esquema y validación
- [x] Revisar la estructura real de `calificaciones` y `solicitudes_tutoria` (columnas, claves y constraints) y anotar cómo se llega de una calificación a su tutor y dónde está la puntuación. Si hace falta un cambio, crearlo en el siguiente script numerado de `database/` (el último es `006_catalogo_materias.sql`), ejecutarlo en Docker y regenerar el esquema con `prisma db pull` y `prisma generate`. Si no hace falta, dejar la conclusión anotada en el plan. (`database/`, `backend/prisma/schema.prisma`)
- [x] Crear el esquema Zod: `q` opcional recortado de hasta 80 caracteres, `materiaId` opcional entero positivo, `filtro` (`todos`, `calificacion`, `promedio`, por defecto `todos`) y el `id` del perfil como entero positivo. (`backend/src/modules/busqueda/busqueda.schema.js`)
- [x] Revisar cómo funciona `validar` y extenderlo (o crear una variante al lado) para validar `req.query` sin reasignarla, porque Express 5 no lo permite, dejando el resultado donde el controller lo lea. Los errores salen con el 400 de Zod existente. (`backend/src/shared/middlewares/validar.js`)

### Búsqueda
- [x] Crear en el repository la consulta de tutores: usuarios distintos del de la sesión con al menos una materia `aprobado`, devolviendo solo sus materias aprobadas con su promedio. (`backend/src/modules/busqueda/busqueda.repository.js`)
- [x] Añadir el filtro de texto por palabras: cada palabra debe coincidir con los nombres, los apellidos o el nombre de alguna materia aprobada, ignorando mayúsculas y tildes gracias a la colación de la BD. Los comodines `%`, `_` y `` se escapan, porque Prisma no lo hace en MySQL. (`backend/src/modules/busqueda/busqueda.repository.js`)
- [x] Añadir el filtro por `materiaId`: solo tutores que tengan esa materia aprobada. (`backend/src/modules/busqueda/busqueda.repository.js`)
- [x] Crear la consulta agregada de calificaciones (promedio y cantidad) para una lista de ids de tutores, sin una consulta por tarjeta. (`backend/src/modules/busqueda/busqueda.repository.js`)
- [x] Obtener la descripción de la solicitud aprobada más reciente que tenga una. (`backend/src/modules/busqueda/busqueda.repository.js`)
- [x] Crear la consulta de materias con al menos un tutor aprobado, para el filtro. (`backend/src/modules/busqueda/busqueda.repository.js`)
- [x] Crear la consulta de un tutor por id con la misma regla (aprobado y distinto del usuario de la sesión), incluyendo su calificación. (`backend/src/modules/busqueda/busqueda.repository.js`)
- [x] Crear en el service la unión de tutores con sus calificaciones y el filtro `calificacion` (4.8 o más, que excluye a los tutores sin calificaciones) y `promedio` (4.5 o más, sobre la materia elegida o, sin materia, sobre cualquiera de sus materias). Las comparaciones se hacen en centésimas enteras, sin `float`. (`backend/src/modules/busqueda/busqueda.service.js`)
- [x] Ordenar por calificación descendente (los que no tienen, al final) y, a igualdad, por promedio en la materia, y limitar a 50. (`backend/src/modules/busqueda/busqueda.service.js`)
- [x] Componer la respuesta pública `{total, tutores}` con id, nombre completo, iniciales, calificación `{promedio, cantidad}`, descripción y materias `{id, nombre, promedio}`, sin correo, cédula, documentos ni estados de otras solicitudes. (`backend/src/modules/busqueda/busqueda.service.js`)
- [x] Crear el servicio del perfil, que responde 404 `TUTOR_NO_ENCONTRADO` de forma idéntica si el tutor no existe, no tiene materias aprobadas o es el propio usuario. (`backend/src/modules/busqueda/busqueda.service.js`)
- [x] Crear el controller y las rutas `GET /api/busqueda/tutores`, `GET /api/busqueda/materias` y `GET /api/busqueda/tutores/:id`, todas con `requerir-sesion`, `requerirRol("estudiante", "tutor")` (403 `ACCESO_DENEGADO` para el administrador) y los parámetros validados con Zod. (`backend/src/modules/busqueda/busqueda.controller.js`, `backend/src/modules/busqueda/busqueda.routes.js`)
- [x] Montar el router en la app como `/api/busqueda`. (`backend/src/app.js`)
- [x] Confirmar que ninguna respuesta ni log expone correo, cédula, certificados ni estados `pendiente` o `rechazado`. (`backend/src/modules/busqueda/`)

## Frontend

- [ ] Leer la vista "Buscar tutores" del prototipo `Saber-Compartido-Dashboard` y anotar estructura, textos, estados y colores, mapeándolos a los tokens de `index.css`. (`~/Escritorio/Saber-Compartido-Dashboard/`)
- [ ] Crear el cliente HTTP de búsqueda siguiendo `api-resumen.js`: tutores, materias y perfil, con manejo del 401 y soporte para cancelar la petición anterior. (`frontend/src/features/busqueda/api-busqueda.js`)
- [ ] Crear el hook que lee y escribe texto y filtros en la URL con `useSearchParams` como única fuente de verdad, espera un momento tras escribir y cancela la petición anterior. (`frontend/src/features/busqueda/use-busqueda.js`)
- [ ] Crear la tarjeta del tutor con avatar (`avatar.jsx`), nombre con marca de verificado, programa (constante de `features/tutor/constantes.js`), calificación y cantidad (o "Aún sin calificaciones"), descripción, materias con su promedio y los botones "Ver perfil" y "Solicitar" deshabilitado como "Próximamente". (`frontend/src/features/busqueda/tarjeta-tutor.jsx`)
- [ ] Crear los filtros: buscador, selector de materia con las materias que tienen tutores y selector de "Todos", "Calificación 4.8 o más" y "Promedio 4.5 o más", con botón "Limpiar filtros". (`frontend/src/features/busqueda/filtros-busqueda.jsx`)
- [ ] Crear la pantalla con el encabezado y el contador de tutores, el botón "Ser tutor", la rejilla de tarjetas, los estados de carga y error con "Reintentar" y los tres vacíos (sin tutores para la materia, sin coincidencias con los filtros y sin ningún tutor verificado). (`frontend/src/pages/Dashboard/BuscarTutores.jsx`)
- [ ] Añadir el campo de búsqueda a la barra superior, que al enviarse lleva a `/dashboard/buscar-tutores?q=...`; ocultarlo para el administrador y en móvil. (`frontend/src/features/dashboard/topbar.jsx`)
- [ ] Hacer que la entrada "Buscar tutores" apunte a la ruta real y registrar las rutas de búsqueda y de perfil dentro de `LayoutDashboard`, con la misma redirección del administrador que el resto de rutas de estudiante. (`frontend/src/features/dashboard/navegacion.js`, `frontend/src/App.jsx`)
- [ ] Verificar el diseño en móvil (una sola columna) y escritorio. (`frontend/src/pages/Dashboard/BuscarTutores.jsx`)
- [ ] **Último y cortable:** crear la pantalla de perfil con nombre, verificado, programa, calificación y cantidad, descripción y materias con su promedio, con estados de carga, error y "no encontrado", y "Solicitar tutoría" deshabilitado. (`frontend/src/pages/Dashboard/PerfilTutor.jsx`)

## Pruebas / validación

- [ ] Lint del backend: `npx oxlint src`. (`backend/`)
- [ ] Lint del frontend: `npm run lint`. (`frontend/`)
- [ ] Preparar datos de prueba: al menos 3 tutores con materias distintas y uno con una materia aprobada y otra pendiente, aprobándolos desde la cuenta de administrador, y algunas calificaciones de prueba respetando los constraints de `calificaciones`. (`database/`)
- [ ] Con curl (`127.0.0.1:3000`): sin sesión las rutas devuelven 401, con un administrador devuelven 403 `ACCESO_DENEGADO`, y con sesión de estudiante `GET /api/busqueda/materias` solo trae materias con tutores aprobados. (`backend/`)
- [ ] Con curl: buscar por nombre completo ("nombre apellido"), por solo una palabra, por materia, con tildes y sin ellas, y con mayúsculas. (`backend/`)
- [ ] Con curl: `materiaId` válido filtra por esa materia, y valores inválidos (`materiaId=abc`, `filtro=otro`, `q` de más de 80 caracteres) devuelven el 400 de Zod. (`backend/`)
- [ ] Con curl: los filtros "calificación 4.8 o más" y "promedio 4.5 o más" (con y sin materia) devuelven lo esperado, y el orden y el tope de 50 se respetan. (`backend/`)
- [ ] Con curl: el usuario no aparece en sus propios resultados, y su propio perfil, el de un id inexistente y el de un tutor sin materias aprobadas devuelven el mismo 404. (`backend/`)
- [ ] Comprobar que una materia pendiente o rechazada nunca aparece en tarjetas, perfil ni filtro, y que al aprobar una solicitud el tutor aparece de inmediato. (`backend/`)
- [ ] Revisar las respuestas y confirmar que no contienen correo, cédula, documentos ni identificadores innecesarios. (`backend/`)
- [ ] En el navegador: búsqueda por texto, filtros combinados, el estado en la URL al recargar, los tres estados vacíos, carga y error con "Reintentar", sesión expirada (401) y comparación visual con el prototipo en móvil y escritorio. (`frontend/`)
- [ ] En el navegador: el buscador de la barra superior lleva a la pantalla con el texto aplicado, el administrador es redirigido y no ve el buscador. (`frontend/`)
- [ ] Regresión: registro de tutor, verificación del administrador, login, Google, logout y Resumen siguen funcionando. (`frontend/`, `backend/`)

## Cierre

- [ ] Revisar el diff completo y confirmar que no hay `console.log`, secretos ni datos de prueba. (`./`)
- [ ] Confirmar que `package.json` y el lock no cambian. (`backend/package.json`)
- [ ] Hacer commit con un mensaje claro y `git push`. (`./`)
- [ ] Escribir el resumen de la feature para la siguiente sesión. (`features/008-buscar-tutor/`)

## Mantenimiento

- [ ] Completar los pendientes abiertos de 007: pruebas con Gemini, clave con facturación, despliegue en Railway y Aiven, roadmap y `tech-stack.md`. (`features/007-verificacion-tutor/tasks.md`)
- [ ] Mover 008 a "Hecho" en el roadmap y dejar DISP-TUT-001 como siguiente. (`constitution/roadmap.md`)
- [ ] Documentar en `tech-stack.md` el módulo `busqueda`, sus endpoints y la decisión de filtrar y ordenar en el service. (`constitution/tech-stack.md`)
- [ ] Anotar en el backlog: paginación, orden configurable, búsqueda por programa, semestre y etiquetas del tutor, "Tutores recomendados" del Resumen, mover el filtro y el orden a SQL si crece el volumen y el perfil público si se cortó. (`constitution/roadmap.md`)