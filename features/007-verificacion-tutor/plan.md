# Plan · 007 Verificación de tutor con IA

## Enfoque

Al guardarse una solicitud de tutor (006), el backend lanza en segundo plano la lectura del certificado con un modelo de IA (Gemini Flash). El modelo solo devuelve datos en un JSON; el backend los valida con Zod, los compara con lo declarado y con la cuenta, y guarda el resultado en las columnas `ia_*` de `documentos_verificacion`. Un administrador ve ese primer vistazo, abre el certificado y aprueba o rechaza cada materia. Solo esa acción cambia `estado` y, al aprobar, el rol del usuario.

Todo lo relacionado con IA y verificación vive en el sub-módulo aislado `backend/src/modules/tutores/verificacion/` (como indica el tech-stack), con el proveedor detrás de una única función. La vista de administrador se construye sobre el shell del dashboard con la entrada "Verificaciones" visible solo para ese rol. La referencia visual es la sección de administrador del prototipo `Saber-Compartido-Dashboard`, que se replica en React con los tokens existentes sin copiar su código de demostración.

## Implementación

1. **Script SQL del catálogo.** Siguiente script numerado en `database/` que inserta las 7 materias del certificado (sin Inglés) con `INSERT IGNORE`, de modo que se pueda ejecutar varias veces. No hay cambios de esquema: las columnas `ia_*` de `documentos_verificacion` ya cubren lo que se guarda, y las alertas se guardan en `ia_alertas` como una lista de `{codigo, mensaje}`.

2. **Configuración de IA.** En `backend/src/config/index.js` añadir `ia.apiKey`, `ia.modelo` y `ia.timeoutMs` desde `GEMINI_API_KEY`, `GEMINI_MODELO` y un tiempo máximo. Documentar las variables en `backend/.env.example`. Si falta la clave, la aplicación arranca y las solicitudes quedan "sin procesar" con un aviso en el log.

3. **Proveedor de IA.** `verificacion/proveedor-ia.js` expone `extraerDatosCertificado({bytes, mime})`. Llama a la API REST de Gemini con `fetch` (sin SDK nuevo), envía el archivo en base64 con el prompt y un esquema de salida JSON, aplica un tiempo máximo y devuelve el resultado validado con Zod (`verificacion.schema.js`). Cualquier error o respuesta inválida se lanza como un error propio, sin incluir el contenido del documento. No se pide ni se guarda la cédula.

4. **Comparación y alertas.** `verificacion/comparar.js` contiene funciones puras, sin acceso a BD ni a la red:
   - `normalizar(texto)`: mayúsculas, sin tildes, espacios colapsados.
   - Coincidencia de nombre: cada palabra del nombre y apellidos de la cuenta debe estar en el nombre extraído, sin importar el orden.
   - Coincidencia de materia: igualdad tras normalizar.
   - Comparación de notas en centésimas enteras, sin `float`.
   - `generarAlertas(...)` produce las alertas definidas en el spec (nombre, materia ausente, nota distinta, nota menor que 4.00, estado distinto de APROBADO, sin firma, ilegible, no procesado).

5. **Servicio de procesamiento.** `verificacion/verificacion.service.js` con `procesarArchivo(archivoId)`: carga los bytes del archivo y las solicitudes ligadas a él, llama al proveedor una sola vez, calcula las alertas de cada solicitud y actualiza sus filas `ia_*` junto con `ia_procesado_en`. Un registro en memoria evita procesar dos veces a la vez el mismo archivo. Si falla, deja `ia_procesado_en` en nulo y registra el error sin datos personales. Al final de `registrarSolicitudes` (006), tras confirmarse la transacción, se lanza `procesarArchivo` sin esperar su resultado.

6. **Autorización por rol.** `backend/src/shared/auth/requerir-rol.js`: middleware que va después de `requerir-sesion`, consulta el rol actual en la BD (el JWT solo lleva el `sub`) y responde 403 `ACCESO_DENEGADO` si no es `administrador`.

7. **Endpoints de administración.** `verificacion.repository.js`, `verificacion.controller.js` y `verificacion.routes.js`, montados en `backend/src/app.js` bajo `/api/admin`, todos con `requerir-sesion` y `requerir-rol`:
   - `GET /api/admin/verificaciones`: solicitudes `pendiente` con cuenta, materia, nota declarada, fecha e indicador.
   - `GET /api/admin/verificaciones/:id`: detalle con lo declarado, lo extraído y las alertas.
   - `GET /api/admin/verificaciones/:id/certificado`: devuelve los bytes con su tipo MIME, `Content-Disposition: inline`, `Cache-Control: private, no-store` y `X-Content-Type-Options: nosniff`.
   - `POST /api/admin/verificaciones/:id/resolver` con `{decision}`: valida con Zod y, en una transacción, actualiza la solicitud solo si sigue `pendiente` (si no, 409 `SOLICITUD_YA_RESUELTA`), guarda `revisado_por` y `revisado_en` y, si se aprueba, cambia `usuarios.rol` a `tutor` solo cuando era `estudiante`.
   - `POST /api/admin/verificaciones/:id/reprocesar`: vuelve a lanzar `procesarArchivo` y responde de inmediato.

   El `:id` es el de la solicitud (`tutores_materias`), y se usa el documento más reciente de esa solicitud.

8. **Script de administrador.** `backend/scripts/crear-admin.js` lee `ADMIN_CORREO`, `ADMIN_NOMBRES`, `ADMIN_APELLIDOS` y `ADMIN_CONTRASENA` del entorno, aplica bcrypt con costo 10 y crea o actualiza esa cuenta con rol `administrador` y correo verificado. Se ejecuta con `node --experimental-strip-types`. Se recomienda una cuenta distinta de la de pruebas del estudiante, porque el rol es único por usuario.

9. **Estudiar el prototipo.** Leer la sección de administrador de `Saber-Compartido-Dashboard` (lista, tarjeta de revisión, textos, estados y colores) y mapearla a los tokens de `index.css`.

10. **Cliente HTTP y navegación.** `frontend/src/features/verificacion/api-verificacion.js` con el patrón de `api-resumen.js`. En `navegacion.js` se añade una sección "Administración" con la entrada "Verificaciones" y un campo `soloRol`; `sidebar.jsx` filtra por el rol de `usuario`. Este es el único cambio al sidebar y se justifica porque es la primera entrada condicionada por rol.

11. **Vistas de administración.** `frontend/src/pages/Dashboard/Verificaciones.jsx` (lista con indicador "Pendiente de revisión" o "Requiere revisión manual") y `VerificacionDetalle.jsx` (declarado frente a extraído, alertas, enlace al certificado en una pestaña nueva, botones Aprobar y Rechazar con confirmación y "Reprocesar"), con estados de carga, error con "Reintentar" y vacío. Un componente `RutaPorRol` envuelve las rutas y redirige a `/dashboard` si el rol no es administrador. Las rutas se registran en `App.jsx` dentro de `LayoutDashboard`.

12. **Validación.** Sin framework de tests: curl (`127.0.0.1:3000`) y navegador, con el certificado real y una foto del mismo, y casos negativos. Se revisa `npx oxlint src`, `npm run lint` y una comparación visual con el prototipo.

## Decisiones

- **El modelo extrae y el código decide.** Las comparaciones y alertas son funciones puras y auditables; si el modelo se equivoca al leer, el administrador lo ve junto al certificado.
- **La IA nunca cambia `estado` ni `rol`.** Solo la acción del administrador lo hace, que es la regla que definiste.
- **API REST de Gemini con `fetch`, sin SDK.** Evita una dependencia y mantiene el proveedor intercambiable detrás de una función.
- **Segundo plano sin cola.** Se procesa en el mismo proceso, después de responder. Es lo más simple para el MVP y el botón "Reprocesar" cubre los casos en que se pierda el trabajo.
- **Alertas en `ia_alertas`.** No se añaden columnas: "sin procesar" es `ia_procesado_en` nulo y "ilegible" o "estado no aprobado" son alertas.
- **Decisión por materia.** Es la unidad del modelo: una materia puede aprobarse y otra rechazarse con el mismo certificado.
- **Rol consultado en la BD en cada petición protegida.** El JWT solo lleva el `sub`, así que un cambio de rol surte efecto de inmediato y no requiere reemitir sesión.
- **Certificado servido solo por endpoint de administrador**, con cabeceras que impiden almacenarlo en caché.
- **Cuenta de administrador por script y variables de entorno**, para que la contraseña no quede en el código ni en el historial de comandos del repositorio.
- **Catálogo con `INSERT IGNORE`.** `materias.nombre` es único y la colación `utf8mb4_0900_ai_ci` ignora tildes y mayúsculas, así que el script puede repetirse sin duplicar.

## Riesgos

- **Privacidad con Gemini.** Los certificados contienen datos personales, incluida la cédula, que el modelo ve aunque no se guarde. En la capa gratuita el proveedor puede usar los datos para mejorar sus modelos. Verifica los términos vigentes y, si quieres evitarlo, usa una clave con facturación habilitada. El aviso de IA del formulario de 006 ya existe.
- **Cuotas y límites.** Un error 429 o un tiempo agotado deja la solicitud "sin procesar". No afecta el registro y el administrador puede reprocesar o revisar a mano.
- **El modelo puede leer mal un número.** Por eso la IA nunca decide y el certificado se muestra junto a lo extraído.
- **Texto malicioso dentro del documento** (instrucciones que intenten influir al modelo). La salida se valida con Zod, las comparaciones las hace el código y el administrador decide, así que el daño se limita a una alerta incorrecta.
- **Trabajo perdido al reiniciar el proceso.** Las solicitudes en curso quedan "sin procesar" y se reprocesan a mano.
- **Nombres del catálogo distintos a los del certificado.** La normalización cubre tildes, mayúsculas y espacios, pero no abreviaturas ni sinónimos. A futuro conviene una columna `codigo` en `materias`.
- **Contraseña del administrador.** Se pasa por variable de entorno al ejecutar el script; no la escribas en archivos versionados ni en prompts de opencode.
- **Certificados falsos.** Esta feature no comprueba la autenticidad (el certificado trae un correo de validación para ello). Eso queda en manos del administrador.
- **Foto o escaneo de baja calidad.** Puede dar lecturas incompletas. Probar con una foto real antes de cerrar la feature.