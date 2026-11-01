# Tasks · 007 Verificación de tutor con IA

## Backend

### Catálogo y configuración
- [x] Revisar el último script numerado de `database/` y elegir el siguiente número libre (el anterior es `005_registro_tutor.sql`). (`database/006_catalogo_materias.sql`)
- [x] Crear el script que inserta con `INSERT IGNORE` las materias: Estadística I, Algorítmica y lógica de programación, Álgebra y trigonometría, Lógica para solución de problemas, Lenguajes de programación, Bases de datos y Programación web (línea profundización). (`database/006_catalogo_materias.sql`)
- [x] Ejecutar el script en el MySQL de Docker, repetirlo para confirmar que no duplica, y comprobar en Workbench que el catálogo tiene "Cálculo diferencial" más las 7 nuevas. (`database/006_catalogo_materias.sql`)
- [x] Añadir `ia.apiKey`, `ia.modelo` y `ia.timeoutMs` leyendo `GEMINI_API_KEY`, `GEMINI_MODELO` y `GEMINI_TIMEOUT_MS`, sin que la aplicación falle al arrancar si falta la clave. (`backend/src/config/index.js`)
- [x] Añadir las tres variables a `.env.example` con valores vacíos o de ejemplo, y confirmar que `backend/.env` está en `.gitignore`. (Ya estaban en `backend/.env.template` — nombre usado por el repo — y `.env`/`.env.*` están en `backend/.gitignore` con excepción para el template.) (`backend/.env.example`, `.gitignore`)

### Lectura con IA
- [x] Crear el esquema Zod de la extracción: nombre, primer apellido y segundo apellido (texto o nulo), `materias` (nombre, nota numérica o nula, estado o nulo), `firma_detectada` y `legible` (booleanos). (`backend/src/modules/tutores/verificacion/verificacion.schema.js`)
- [x] Crear el proveedor `extraerDatosCertificado({bytes, mime})`: `fetch` a la API REST de Gemini con la clave en la cabecera, archivo en base64, prompt, respuesta JSON con esquema y tiempo máximo. Valida la respuesta con Zod y lanza un error propio sin incluir el contenido del documento. El prompt indica que no se extraiga la cédula. (`backend/src/modules/tutores/verificacion/proveedor-ia.js`)
- [x] Crear `normalizar(texto)`: mayúsculas, sin tildes, espacios colapsados. (`backend/src/modules/tutores/verificacion/comparar.js`)
- [x] Crear la coincidencia de nombre: todas las palabras normalizadas del nombre y apellidos de la cuenta deben estar en el nombre extraído, en cualquier orden. (`backend/src/modules/tutores/verificacion/comparar.js`)
- [x] Crear la coincidencia de materia (igualdad tras normalizar) y la conversión de notas a centésimas enteras, sin `float`. (`backend/src/modules/tutores/verificacion/comparar.js`)
- [x] Crear `generarAlertas(...)` con los códigos `NOMBRE_NO_COINCIDE`, `MATERIA_AUSENTE`, `NOTA_DISTINTA`, `NOTA_BAJA`, `MATERIA_NO_APROBADA`, `SIN_FIRMA`, `ILEGIBLE` y `NO_PROCESADO`, cada uno con `{codigo, mensaje}`. (`backend/src/modules/tutores/verificacion/comparar.js`)
- [x] Crear el repository: cargar el archivo y las solicitudes ligadas a él (con la cuenta y la materia), actualizar las columnas `ia_*` de cada `documentos_verificacion`, y consultas de lista, detalle y certificado sin cargar `contenido` fuera del endpoint que lo sirve. (`backend/src/modules/tutores/verificacion/verificacion.repository.js`)
- [x] Crear `procesarArchivo(archivoId)`: llamar al proveedor una vez, buscar en lo extraído la materia de cada solicitud, calcular alertas y guardar `ia_nombre_extraido`, `ia_primer_apellido_extraido`, `ia_segundo_apellido_extraido`, `ia_materia_extraida`, `ia_promedio_extraido`, `ia_firma_detectada`, `ia_alertas` e `ia_procesado_en`. Un registro en memoria evita procesar el mismo archivo dos veces a la vez. Si falla, deja `ia_procesado_en` en nulo y registra el error sin datos personales ni contenido. (`backend/src/modules/tutores/verificacion/verificacion.service.js`)
- [x] Lanzar `procesarArchivo` sin esperar su resultado al final del registro de solicitudes, después de confirmarse la transacción, de forma que un fallo de la IA nunca afecte la respuesta ni el guardado. (`backend/src/modules/tutores/tutores.service.js`)

### Administración
- [x] Crear el middleware que, después de `requerir-sesion`, consulta el rol actual en la BD y responde 403 `ACCESO_DENEGADO` si no es `administrador`. (`backend/src/shared/auth/requerir-rol.js`)
- [x] Crear `GET /api/admin/verificaciones`: solicitudes `pendiente` con nombre de la cuenta, materia, nota declarada, fecha e indicador ("Pendiente de revisión" si no hay alertas y está procesada; "Requiere revisión manual" en otro caso). (`backend/src/modules/tutores/verificacion/verificacion.controller.js`, `backend/src/modules/tutores/verificacion/verificacion.routes.js`)
- [x] Crear `GET /api/admin/verificaciones/:id`: detalle con lo declarado, lo extraído y las alertas del documento más reciente de la solicitud. (`backend/src/modules/tutores/verificacion/verificacion.controller.js`)
- [x] Crear `GET /api/admin/verificaciones/:id/certificado`: devuelve los bytes con su tipo MIME, `Content-Disposition: inline`, `Cache-Control: private, no-store` y `X-Content-Type-Options: nosniff`. (`backend/src/modules/tutores/verificacion/verificacion.controller.js`)
- [x] Crear `POST /api/admin/verificaciones/:id/resolver` con `{decision}` validado con Zod (`aprobado` o `rechazado`): en una transacción actualiza `estado`, `revisado_por` y `revisado_en` solo si sigue `pendiente` (si no, 409 `SOLICITUD_YA_RESUELTA`) y, al aprobar, pone `usuarios.rol = 'tutor'` solo si era `estudiante`. (`backend/src/modules/tutores/verificacion/verificacion.service.js`, `backend/src/modules/tutores/verificacion/verificacion.schema.js`)
- [x] Crear `POST /api/admin/verificaciones/:id/reprocesar`: lanza `procesarArchivo` y responde de inmediato. (`backend/src/modules/tutores/verificacion/verificacion.controller.js`)
- [x] Montar las rutas bajo `/api/admin`, todas con `requerir-sesion` y `requerir-rol`. (`backend/src/app.js`)
- [x] Crear el script del administrador: lee `ADMIN_CORREO`, `ADMIN_NOMBRES`, `ADMIN_APELLIDOS` y `ADMIN_CONTRASENA` del entorno, hashea con bcrypt (costo 10) y crea o actualiza la cuenta con rol `administrador` y correo verificado. Rechaza ejecutarse si falta alguna variable. (`backend/scripts/crear-admin.js`)
- [x] Confirmar que ningún endpoint, mensaje de error ni log devuelve `contenido`, la clave de la API ni datos del certificado. (`backend/src/modules/tutores/`)

## Frontend

- [ ] Leer la sección de administrador del prototipo `Saber-Compartido-Dashboard` (lista, tarjeta de revisión, textos, estados y colores) y mapearla a los tokens de `index.css`. (`~/Escritorio/Saber-Compartido-Dashboard/`)
- [ ] Crear el cliente HTTP de verificaciones siguiendo `api-resumen.js`: lista, detalle, resolver y reprocesar, con el manejo del 401 y del 403. (`frontend/src/features/verificacion/api-verificacion.js`)
- [ ] Añadir la sección "Administración" con la entrada "Verificaciones" y un campo `soloRol`, y hacer que el sidebar filtre las entradas por el rol del usuario. (`frontend/src/features/dashboard/navegacion.js`, `frontend/src/features/dashboard/sidebar.jsx`)
- [ ] Crear `RutaPorRol`, que redirige a `/dashboard` si el rol no es el permitido, y envolver con él las rutas de administración. (`frontend/src/features/auth/ruta-por-rol.jsx`)
- [ ] Crear el componente del indicador con los dos estados ("Pendiente de revisión", "Requiere revisión manual") reutilizando los pares de badges de `index.css`. (`frontend/src/features/verificacion/indicador-revision.jsx`)
- [ ] Crear la lista de verificaciones con carga, error con "Reintentar" y vacío. (`frontend/src/pages/Dashboard/Verificaciones.jsx`)
- [ ] Crear el detalle con lo declarado frente a lo extraído, las alertas, el enlace al certificado en una pestaña nueva, y los botones Aprobar, Rechazar y Reprocesar con confirmación, estados de carga y manejo del 409. (`frontend/src/pages/Dashboard/VerificacionDetalle.jsx`)
- [ ] Registrar las rutas de lista y detalle dentro de `LayoutDashboard`. (`frontend/src/App.jsx`)
- [ ] Verificar el diseño en móvil y escritorio y compararlo con el prototipo. (`frontend/src/pages/Dashboard/`)

## Pruebas / validación

- [ ] Lint del backend: `npx oxlint src`. (`backend/`)
- [ ] Lint del frontend: `npm run lint`. (`frontend/`)
- [ ] Probar las funciones de `comparar.js` con casos de ejemplo en un script temporal (no se sube): tildes y mayúsculas, nombre en otro orden, nombre distinto, nota 4.7 frente a 4.70, nota menor que 4.00, estado distinto de APROBADO y materia ausente. (`backend/`)
- [ ] Con curl (`127.0.0.1:3000`): sin sesión las rutas `/api/admin/*` devuelven 401, y con un usuario estudiante devuelven 403. (`backend/`)
- [ ] Crear la cuenta de administrador ejecutando el script con las variables definidas solo en la sesión de PowerShell, sin guardarlas en archivos. (`backend/scripts/crear-admin.js`)
- [ ] Registrar una solicitud de 2 materias (por ejemplo Estadística I y Bases de datos) con el certificado real y comprobar que la respuesta es inmediata y que luego las filas de `documentos_verificacion` tienen `ia_*` e `ia_procesado_en`, y que las alertas están vacías. (`backend/`)
- [ ] Probar los casos de alerta: certificado de una cuenta con otro nombre (`NOMBRE_NO_COINCIDE`), materia solicitada que no está en el certificado como Cálculo diferencial (`MATERIA_AUSENTE`) y nota declarada distinta de la del certificado (`NOTA_DISTINTA`). (`backend/`)
- [ ] Probar con una foto (JPG) del certificado impreso y con una imagen borrosa, y anotar qué lee bien y qué falla. (`backend/`)
- [ ] Quitar `GEMINI_API_KEY` y registrar una solicitud: el registro responde 201, la solicitud queda sin procesar y el administrador puede reprocesarla al restaurar la clave. (`backend/`)
- [ ] Probar con una clave inválida y con un tiempo máximo muy bajo: la solicitud queda sin procesar y el log no incluye datos personales ni la clave. (`backend/`)
- [ ] Como administrador: aprobar una materia cambia `estado`, `revisado_por`, `revisado_en` y el rol a `tutor`; rechazar no cambia el rol; resolver dos veces devuelve 409; un administrador aprobando no baja su rol. (`database/`)
- [ ] Confirmar que `GET /api/auth/yo` del tutor aprobado devuelve `rol: tutor` en su siguiente carga. (`backend/`)
- [ ] Comprobar que el endpoint del certificado devuelve el PDF con las cabeceras esperadas al administrador y 403 a un estudiante. (`backend/`)
- [ ] En el navegador: el sidebar muestra "Verificaciones" solo al administrador, un estudiante que entra a la ruta es redirigido, el flujo completo de revisar y aprobar o rechazar, estados de carga y error, y móvil. (`frontend/`)
- [ ] Regresión: el registro de tutor (006), login, Google, logout y el Resumen siguen funcionando. (`frontend/`, `backend/`)

## Cierre

- [ ] Revisar el diff completo y confirmar que no hay `console.log`, claves, contraseñas ni certificados de prueba. (`./`)
- [ ] Confirmar que `package.json` y el lock no tienen dependencias nuevas. (`backend/package.json`)
- [ ] Hacer commit con un mensaje claro y `git push`. (`./`)
- [ ] Añadir `GEMINI_API_KEY`, `GEMINI_MODELO` y `GEMINI_TIMEOUT_MS` en las variables de Railway. (`Railway`)
- [ ] Ejecutar el script del catálogo en la base de Aiven y crear allí la cuenta de administrador con variables de entorno solo en esa sesión. (`database/006_catalogo_materias.sql`, `backend/scripts/crear-admin.js`)
- [ ] Escribir el resumen de la feature para la siguiente sesión. (`features/007-verificacion-tutor/`)

## Mantenimiento

- [ ] Completar los pendientes de Mantenimiento de 006 que sigan abiertos. (`features/006-registro-tutor/tasks.md`)
- [ ] Mover 007 a "Hecho" en el roadmap y dejar BUS-TUT-001 como siguiente. (`constitution/roadmap.md`)
- [ ] Documentar en `tech-stack.md` el proveedor de IA (Gemini), las variables de entorno, el sub-módulo `verificacion/`, el middleware de rol y el script `crear-admin.js`. (`constitution/tech-stack.md`)
- [ ] Anotar en el backlog: motivo de rechazo y notificación por correo, columna `codigo` en `materias`, carga completa del catálogo, revocar o reabrir una solicitud resuelta, aprobación en lote y la decisión de usar una clave con facturación para que Google no use los certificados. (`constitution/roadmap.md`)