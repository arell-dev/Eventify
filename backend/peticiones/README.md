# Guía de peticiones de Eventify

## Preparar el entorno

1. Abre la carpeta del proyecto en Visual Studio Code e instala la extensión [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client).
2. Desde la raíz del repositorio `ProyectoFinal (JS)`, abre una terminal de PowerShell e inicia el backend.

   ```powershell
   cd backend
   npm.cmd ci
   npm.cmd start
   ```

   Ejecuta `npm.cmd ci` la primera vez o cuando cambien las dependencias. Deja abierta la terminal del backend. Las peticiones llaman directamente a `http://localhost:3000/api`, por lo que basta con iniciar el backend. Conserva `Origin: http://localhost:4200` en las operaciones que lo incluyen.

3. Abre [sesion.http](./sesion.http) y ejecuta **Consultar el estado de la API**. Debe devolver `200` con `{"estado":"ok"}`.
4. Abre el archivo del recorrido y pulsa **Send Request** sobre cada bloque `###`, en el orden indicado. En Windows también puedes colocar el cursor dentro de un bloque y pulsar `Ctrl+Alt+R`. [Documentación de REST Client](https://github.com/Huachao/vscode-restclient#usage)

## Cómo se encadenan las peticiones

- Inicia sesión **en el archivo que vas a usar**. En Participantes y Ponentes, el paso **01** pide la contraseña administrativa en un cuadro oculto. Cambia `@adminCorreo` si usas otra cuenta. Para la cuenta inicial local, consulta el bloque de inicio de sesión en [sesion.http](./sesion.http).
- Un bloque con `# @name` guarda su última respuesta en REST Client. Por ejemplo, `{{inicioParticipantes.response.headers.Set-Cookie}}` toma la cookie del paso **01**, `{{cuentaParticipantes.response.body.$.id}}` toma el ID de usuario del paso **03**, y `{{altaParticipante.response.body.$.id}}` toma el ID del **perfil** creado en el paso **05**. Ejecuta el bloque que produce cada valor antes de usarlo. [Variables de petición de REST Client](https://github.com/Huachao/vscode-restclient#request-variables)
- Si falla un alta que tiene nombre, corrige el problema y repite esa petición antes de continuar. Los casos de error intencionales tienen sus propios bloques, de modo que puedes ejecutarlos sin reemplazar la respuesta del alta.
- Ejecuta un recorrido completo antes de repetirlo. Volver a ejecutar el paso **03** genera otro correo de prueba y cambia el ID que usarán las peticiones siguientes. Si caduca la sesión o reinicias el servidor, repite el paso **01** del mismo archivo. [Variables dinámicas de REST Client](https://github.com/Huachao/vscode-restclient#system-variables)

## Participantes y Ponentes

Los dos archivos son recorridos independientes. Puedes probar cualquiera primero. Cada uno crea sus propios recursos y usa sus respuestas para las consultas y bajas.

### Participantes

Abre [participantes.http](./participantes.http).

1. Ejecuta **01–04** para iniciar sesión, ver el listado, crear una cuenta y comprobar que esa cuenta aparece en el selector.
2. Ejecuta **05–08** para registrar el participante, consultar su ficha y comprobar el historial vacío `[]`. Repetir el alta en el paso **08** debe dar `409`.
3. Ejecuta **09–14** para probar la relación con Inscripciones. El recorrido registra la misma cuenta como ponente auxiliar, crea un evento con ese ponente e inscribe al participante. El historial muestra el título del evento. Después de cancelar la inscripción, el paso **14** debe devolver `409` porque el registro sigue vinculado.
4. Ejecuta **15–19** para eliminar la inscripción cancelada, el evento, el ponente auxiliar y el participante, en ese orden. La última consulta debe devolver `404`. Para probar solo el alta y la baja, tras el paso **08** puedes ir directamente al **18** y luego al **19**.

### Ponentes

Abre [ponentes.http](./ponentes.http).

1. Ejecuta **01–04** para iniciar sesión, ver el listado, crear una cuenta y comprobar que aparece en el padrón de ponentes.
2. Ejecuta **05–09** para registrar el ponente, comprobar la agenda vacía `[]` y editar su especialidad. El `PUT` debe conservar el `usuarioId`. El alta duplicada del paso **09** debe devolver `409`.
3. Ejecuta **10–12** para asignarle un evento y consultar la agenda. El evento nuevo tiene diez cupos disponibles. La baja del ponente debe devolver `409` mientras el evento siga asignado.
4. Ejecuta **13–15** para eliminar primero el evento y luego el ponente. La última consulta debe devolver `404`. Para probar solo el alta, la edición y la baja, tras el paso **09** puedes ir directamente al **14** y luego al **15**.

Las operaciones de escritura afectan al archivo local `backend/src/datos/eventify.json`. Los pasos finales quitan los perfiles, eventos e inscripciones creados en el recorrido. Las cuentas de prueba quedan en el padrón y la creación y la baja de eventos pueden dejar avisos en esas cuentas.

## Orden de los demás archivos

| Archivo | Orden de ejecución |
| --- | --- |
| [sesion.http](./sesion.http) | Estado → inicio de sesión → consulta de sesión → cierre (`204`). El bloque con credenciales incorrectas se puede ejecutar por separado y debe devolver `401`. |
| [usuarios.http](./usuarios.http) | Inicio de sesión → consulta de cuentas y selectores. Para el ejemplo combinado, cambia el correo de prueba, crea la cuenta y luego registra sus dos perfiles. Usa las altas antes de consultar, editar o dar de baja el perfil correspondiente. Antes de un caso de baja bloqueada, confirma que el ID configurado tiene relaciones en su agenda o historial. |
| [eventos.http](./eventos.http) | Las dos consultas públicas se pueden ejecutar sin sesión. Para el recorrido administrativo, inicia sesión, lista eventos y verifica que el ponente del cuerpo exista. Crea el evento antes de consultar su ficha e inscripciones, editarlo o eliminarlo. |
| [inscripciones.http](./inscripciones.http) | Inicio de sesión → listado → crear evento futuro → inscribir a un participante existente → consultar → cancelar → reactivar → cancelar de nuevo → eliminar inscripción → eliminar evento. Si los perfiles iniciales cambiaron, consulta sus listados y ajusta `ponenteId` y `participanteId`. |
| [catalogo.http](./catalogo.http) | Listar eventos públicos → iniciar sesión como usuario → consultar la inscripción propia → inscribirse. Usa el mismo ID de evento en el GET y POST, y elige uno futuro con cupo. Para marcar un aviso, lista primero las notificaciones propias y usa un ID de esa respuesta. La consulta administrativa del final debe dar `403` con esa sesión de usuario. |

## Si un bloque falla

| Resultado | Qué revisar |
| --- | --- |
| Error de conexión | Verifica que el backend siga activo en el puerto `3000` y repite el estado de la API. |
| `401` | Verifica la cuenta y la contraseña, o repite el inicio de sesión del archivo para renovar la cookie. |
| `403` | Comprueba que la cuenta sea administradora y que la petición de escritura envíe el `Origin` indicado. |
| `400` o una variable sigue apareciendo como `{{...}}` | Ejecuta primero el bloque nombrado que devuelve el ID y confirma que respondió con éxito. Los IDs del JSON se envían como números. |
| `404` | Revisa que el registro exista. En los dos recorridos nuevos se espera `404` al consultar la ficha después de eliminarla. |
| `409` | Lee el campo `mensaje`. Los bloques marcados comprueban duplicados o bajas bloqueadas. Si ocurre al crear un evento, revisa que el ponente elegido tenga libre el horario. |
