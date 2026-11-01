# 007 · Verificación de tutor con IA

## Qué hace

Una vez que un estudiante envía su solicitud para ser tutor (006), la plataforma lee su certificado de notas con un modelo de IA, extrae los datos y los compara con lo que el estudiante declaró. El resultado se muestra a un administrador como un primer vistazo (con o sin alertas). La IA nunca aprueba ni rechaza: el administrador revisa el certificado y decide, materia por materia, si aprueba o rechaza. Al aprobar la primera materia, el usuario pasa a ser tutor.

## Por qué

Revisar certificados a mano, uno por uno, es lento. La IA agiliza esa primera revisión: señala qué coincide y qué no. La decisión final es siempre de una persona, porque la IA puede equivocarse y no puede comprobar que el documento sea auténtico.

## Criterios de aceptación

### Lectura con IA
- [ ] Al registrarse una solicitud (006), el certificado se procesa automáticamente en segundo plano sin retrasar ni hacer fallar la respuesta del registro.
- [ ] El modelo devuelve un JSON con un esquema fijo: nombre, primer apellido, segundo apellido, lista de materias (nombre, nota y estado de cada una), si hay bloque de firma y si el documento es legible. Si un dato no se ve, es nulo.
- [ ] La cédula y otros datos personales no se piden al modelo ni se guardan.
- [ ] El certificado se lee una sola vez por envío, y el resultado se asigna a la solicitud de cada materia en `documentos_verificacion` (campos `ia_*`) con la materia que le corresponde.
- [ ] Si la IA falla (error, tiempo agotado, sin cuota o respuesta inválida), la solicitud sigue `pendiente`, queda marcada como "no procesado" y el administrador puede reintentar o revisar a mano.

### Alertas (comparación hecha por el backend, no por el modelo)
- [ ] La comparación normaliza el texto: mayúsculas, sin tildes y sin espacios extra.
- [ ] Se genera una alerta si: el nombre extraído no coincide con el de la cuenta; la materia solicitada no aparece en el certificado; la nota extraída no coincide con la declarada; la nota extraída es menor que 4.00; el estado de la materia no es APROBADO; no se detecta bloque de firma; el documento no es legible; o no se pudo procesar.
- [ ] Cada alerta tiene un texto claro y se guarda en `ia_alertas`.
- [ ] La solicitud muestra un indicador: "Pendiente de revisión" (sin alertas) o "Requiere revisión manual" (con alertas o no procesada).

### Vista de administrador
- [ ] Un usuario con rol `administrador` ve una entrada "Verificaciones" en el sidebar; los demás no la ven y sus rutas responden 403.
- [ ] La lista muestra las solicitudes `pendiente` con nombre de la cuenta, materia, nota declarada, fecha de envío y el indicador de revisión.
- [ ] El detalle muestra lado a lado lo declarado y lo extraído por la IA, las alertas y un botón para ver el certificado.
- [ ] El certificado solo se puede ver a través de un endpoint protegido, accesible únicamente para administradores.
- [ ] El administrador puede aprobar o rechazar cada materia por separado.
- [ ] Al aprobar o rechazar se guardan `estado`, `revisado_por` y `revisado_en`.
- [ ] Al aprobar una materia, si el usuario es `estudiante`, su rol pasa a `tutor`. Nunca baja un rol ya existente.
- [ ] El administrador puede reprocesar con la IA una solicitud no procesada o con error.
- [ ] La vista sigue la sección de administrador del prototipo `Saber-Compartido-Dashboard`, es usable en móvil y respeta los tokens visuales del tech-stack.

### Catálogo y cuenta de administrador
- [ ] El catálogo `materias` incluye, además de "Cálculo diferencial": Estadística I, Algorítmica y lógica de programación, Álgebra y trigonometría, Lógica para solución de problemas, Lenguajes de programación, Bases de datos y Programación web (línea profundización). Se cargan con un script repetible, que no duplica filas.
- [ ] Existe un script para crear (o actualizar) una cuenta con rol `administrador`, con correo verificado, que toma sus datos de variables de entorno y nunca los guarda en el código ni en el repositorio.

### General
- [ ] Solo puede resolver una solicitud el administrador; la IA no cambia nunca `estado` ni `rol`.
- [ ] Una solicitud ya aprobada o rechazada no se puede resolver de nuevo.
- [ ] El proveedor de IA queda aislado detrás de una única función, para poder cambiarlo sin tocar el resto.
- [ ] La clave de la API de IA vive solo en `backend/.env`, nunca en el código ni en los logs.
- [ ] Los errores siguen el contrato `{codigo, mensaje}` y el 400 de Zod `{mensaje, detalle}`.
- [ ] Lint sin errores y sin dependencias nuevas que no estén justificadas en el plan.

## Fuera de alcance

- Comprobar que el certificado sea auténtico (firma, sello o consulta al correo de validación): lo evalúa la persona.
- Motivo de rechazo y notificaciones por correo al estudiante.
- "Modo tutor" / "Mis tutorías" y cualquier vista de tutor en el shell.
- Crear administradores desde la aplicación: se crean con un script SQL.
- Revocar una aprobación o reabrir una solicitud resuelta.
- Columna `codigo` en `materias` y carga completa del catálogo (esta feature solo añade las 7 materias del certificado de prueba, sin Inglés).
- Perfil público del tutor, su calificación y el semestre.
- Aprobar o rechazar en lote.