# Plan · 006 Registro de tutor

## Enfoque

El registro es un formulario multipart (materias con su promedio, un certificado y una descripción opcional) que crea una solicitud `pendiente` por materia en `tutores_materias`, todas ligadas a un mismo certificado. Se construye sobre lo que ya existe: la sesión por cookie (`requerir-sesion`), el patrón routes → (validar) → controller → service → repository, el shell del dashboard y la entrada "Ser tutor" de `navegacion.js`.

La referencia visual es el prototipo `Saber-Compartido-Dashboard` (carpeta del Escritorio de Miguel: `index.html`, `css/styles.css`, `js/app.js`), en su sección "Ser tutor". Es HTML/CSS/JS plano con datos de demostración: se replica su estructura y estilos en React con los tokens de Tailwind ya definidos, sin copiar su código ni su lógica de demo.

El certificado se guarda en la base de datos y no en disco, porque Railway tiene disco efímero y el MVP no justifica un servicio de almacenamiento externo. Los bytes se guardan una sola vez en una tabla nueva, `archivos_certificado`. La tabla existente `documentos_verificacion` se reutiliza con una fila por solicitud: es donde TUT-VER-001 guardará lo que extraiga la IA (`ia_*`), y apunta al archivo con una FK nueva, `archivo_id`.

El backend es el único que decide: el `usuarioId` sale de la sesión y los promedios, el tipo y el tamaño del archivo se validan en el servidor. El frontend replica las validaciones solo para dar feedback rápido. El programa académico es una constante de presentación, no un dato que viaje al servidor.

## Implementación

1. **Script SQL y esquema.** Crear el siguiente script numerado en `database/` que:
   - Crea `archivos_certificado` (id, `usuario_id` con FK a `usuarios`, nombre original, tipo MIME, tamaño, contenido `LONGBLOB`, fecha de subida).
   - Añade `archivo_id` (FK, NULL) a `documentos_verificacion`.
   - Añade `descripcion` (`VARCHAR(500)`, NULL) a `tutores_materias`.
   - Garantiza un `UNIQUE (tutor_id, materia_id)` en `tutores_materias`, comprobando antes que no haya duplicados.

   Aplicarlo en el MySQL de Docker y regenerar `backend/prisma/schema.prisma` con `prisma db pull`, sin migraciones de Prisma.

2. **Catálogo de materias.** Módulo nuevo `backend/src/modules/materias/` (routes → controller → service → repository) con `GET /api/materias`, protegido con sesión, que devuelve todas las materias ordenadas por nombre (la tabla no tiene estado activo). Se hace como módulo propio porque BUS-TUT-001 lo reutilizará.

3. **Validación de la solicitud.** En `backend/src/modules/tutores/tutores.schema.js`, esquema Zod 4 con:
   - `materias`: lista de 1 a 5 elementos `{materiaId, promedio}`, sin `materiaId` repetido.
   - `materiaId`: entero positivo.
   - `promedio`: recibido como texto, con coma normalizada a punto, máximo 2 decimales y rango 4.00–5.00 comparado sin pasar por `float`.
   - `descripcion`: opcional, hasta 500 caracteres.

   Como multipart solo transporta texto, `materias` llega como un campo JSON serializado que el middleware parsea antes de pasar por Zod. Los errores salen con el 400 de Zod existente.

4. **Recepción del archivo.** Agregar `multer` (única dependencia nueva) con almacenamiento en memoria, un solo archivo y límite de 5 MB. Un middleware en `backend/src/shared/` (junto a `validar.js`) hace tres cosas:
   - Ejecuta multer.
   - Traduce sus errores (`LIMIT_FILE_SIZE`, archivo inesperado, archivo ausente) al contrato `{codigo, mensaje}`.
   - Comprueba el tipo real del archivo por sus primeros bytes (PDF, JPG, PNG) y no por el MIME que declara el cliente.

5. **Servicio de registro.** `backend/src/modules/tutores/tutores.service.js`:
   - Verifica que todas las materias existan.
   - Rechaza el envío completo, indicando cuáles, si alguna ya está `pendiente` o `aprobado` para ese usuario.
   - En una sola transacción de Prisma guarda el archivo en `archivos_certificado` y, por cada materia, su fila en `tutores_materias` con la descripción. Si la materia estaba `rechazado`, reutiliza la fila: vuelve a `pendiente`, actualiza el promedio y limpia `revisado_por` y `revisado_en`.
   - Crea siempre una fila nueva en `documentos_verificacion` con el `archivo_id` y con `url_archivo` igual a `db://archivos_certificado/{id}`, de modo que las resubmisiones conserven historial.
   - No toca `usuarios.rol`.

6. **Repository y endpoints.** `tutores.repository.js` encapsula Prisma (buscar solicitudes del usuario para esas materias, crear archivo, crear o reactivar solicitudes, crear documentos, listar las del usuario sin cargar el `contenido` del archivo). `tutores.routes.js` expone, protegidos con `requerir-sesion`:
   - `GET /api/tutores/solicitudes`, que devuelve las solicitudes del usuario con materia, fecha y estado.
   - `POST /api/tutores/solicitudes`, que recibe multipart.

   Montar el router en `backend/src/app.js`. No se crea ningún endpoint para descargar documentos en esta feature.

7. **Cliente HTTP del frontend.** `frontend/src/features/tutor/api-tutor.js` con el patrón de `api-resumen.js` (`credentials: "same-origin"`, 401 propio). El POST usa `FormData` sin fijar `Content-Type`, para que el navegador ponga el boundary, y envía `materias` como JSON serializado. También `api-materias.js` para el catálogo.

8. **Estudiar el prototipo.** Antes de escribir los componentes, leer la sección "Ser tutor" de `Saber-Compartido-Dashboard` (estructura, textos, espaciados, estados y colores) y mapearla a los tokens de `index.css`. Los textos del prototipo que dicen que el archivo "no se sube a un servidor" son de demostración y se reemplazan por textos reales. El prototipo tiene un único campo de promedio; aquí se generaliza a un campo por materia elegida.

9. **Formulario de registro.** `frontend/src/features/tutor/formulario-registro-tutor.jsx` con los campos del prototipo adaptados:
   - Selección múltiple de materias (máximo 5).
   - Un campo de promedio por cada materia elegida.
   - Programa académico en solo lectura, con el valor de una constante en `features/tutor/constantes.js`.
   - Certificado (archivo) y descripción opcional.
   - Aviso de revisión pendiente y botones "Limpiar" y "Enviar solicitud".

   Valida en cliente (rango, decimales, tipo y tamaño), muestra errores por campo a partir de `detalle` y conserva lo escrito si el servidor rechaza. Mobile-first: las dos columnas del prototipo pasan a una sola en pantallas pequeñas.

10. **Paneles laterales y pantalla.** `frontend/src/pages/Dashboard/SerTutor.jsx` compone:
    - El formulario.
    - El panel estático "Antes de postularte".
    - El panel "Estado de mi solicitud", que lista las solicitudes con badge de estado, reutilizando los pares de badges de `index.css`, y maneja carga, error con "Reintentar" y vacío.

    Tras un envío exitoso refresca la lista y muestra la confirmación. Ante un 401 llama a `fijarUsuario(null)`, como `Resumen.jsx`.

11. **Enrutado.** En `frontend/src/features/dashboard/navegacion.js` la entrada "Ser tutor" pasa de placeholder a su ruta real, y en `frontend/src/App.jsx` se registra la ruta dentro de `LayoutDashboard`. El sidebar no se toca.

12. **Validación.** Sin framework de tests: pruebas con curl (usar `127.0.0.1:3000`) y navegador, y `npx oxlint src` en backend y `npm run lint` en frontend. Se cubren los casos felices y los de error de los criterios de aceptación, y se compara visualmente con el prototipo en escritorio y móvil.

## Decisiones

- **Un certificado por envío, varias materias.** Refleja cómo es el documento real, que lista los promedios de varias materias. Los bytes se guardan una vez y cada solicitud apunta a ellos, así no se duplican megabytes por materia.
- **Cada materia sigue siendo una solicitud independiente.** La verificación y el estado (`pendiente|aprobado|rechazado`) se manejan por materia, que es como el modelo ya lo define. Una materia puede aprobarse y otra rechazarse con el mismo documento.
- **Se reutiliza `documentos_verificacion`.** Ya tiene una fila por solicitud y las columnas `ia_*` que TUT-VER-001 necesita, por lo que no se crea una tabla equivalente. Solo se le añade `archivo_id`.
- **Bytes en `archivos_certificado`.** Evita el disco efímero de Railway y un servicio externo. `url_archivo` guarda la referencia `db://archivos_certificado/{id}`, así que migrar a un almacenamiento externo más adelante solo cambia ese valor. Se descarta guardar en disco (se pierde en cada despliegue) y un bucket externo (infraestructura y credenciales extra para el MVP).
- **`UNIQUE (tutor_id, materia_id)`.** Impide duplicados por doble envío concurrente y hace que una solicitud rechazada se reactive en vez de crear una fila nueva. El historial queda en `documentos_verificacion`.
- **La descripción opcional se repite en cada fila de `tutores_materias` del mismo envío.** Es texto corto y evita una tabla extra.
- **Programa académico fijo y no persistido.** No hay datos que guardar ni validar mientras el MVP sea de una sola carrera. Cuando la base gestione programas, se añade la columna y el campo pasa a ser editable.
- **`multer` con memoria.** Con 5 MB y un solo archivo es seguro y simple. Es la única dependencia nueva y se justifica porque no hay forma razonable de recibir multipart con Express a mano.
- **Multipart y no JSON con base64.** Evita inflar el tamaño un 33 % y mantiene el archivo fuera del parser JSON.
- **Tipo de archivo por contenido.** El MIME que declara el cliente es falsificable; los primeros bytes no.
- **Promedio como texto hasta validarlo.** Evita errores de `float` en los bordes (4.00 y 5.00) y permite aceptar la coma.
- **Máximo 5 materias por envío.** Acota el tamaño del formulario y de la transacción sin impedir enviar más materias en otro momento.
- **Prototipo como referencia, no como código.** Se replica el diseño con los componentes y tokens de la app real; la lógica de demo no se porta.
- **Solo registro, sin cambio de rol ni "Modo tutor".** Queda para TUT-VER-001, cuando exista un tutor aprobado. `navegacion.js` ya permite añadir esa entrada condicionada al rol.

## Riesgos

- **Datos previos que violen el `UNIQUE`.** Si ya hay filas duplicadas por (tutor, materia) en la BD de desarrollo, el script falla. El paso 1 lo comprueba antes de crear la restricción.
- **Un archivo compartido entre materias.** Si en el futuro se quiere borrar o reemplazar el certificado, afecta a todas las solicitudes ligadas. Para el MVP no hay edición ni borrado (fuera de alcance).
- **Promedios declarados que no coinciden con el certificado.** Esta feature no comprueba que el documento sea auténtico ni que los promedios declarados coincidan con él. Eso es TUT-VER-001, y el estado `pendiente` evita que se confíe en lo declarado.
- **Semestre sin capturar.** El perfil público de tutor mostrará el semestre y este formulario no lo pide. Queda fuera de 006.
- **Tamaño de paquete de MySQL.** Una petición de varios MB depende de `max_allowed_packet`, que en Aiven puede ser distinto al del Docker local. Probar con un archivo de 5 MB antes de dar la feature por cerrada.
- **Crecimiento de la BD.** Los certificados pesan más que el resto de los datos. Es aceptable para el MVP, y la tabla aparte permite migrarlos a almacenamiento externo después sin tocar `tutores_materias`.
- **Datos personales en los documentos.** Los certificados contienen información personal. Por eso no hay endpoint público de descarga y el contenido nunca va en listados ni en logs.
- **Límites del proxy en producción.** Railway o un proxy intermedio podrían cortar cuerpos grandes. Verificarlo al desplegar.