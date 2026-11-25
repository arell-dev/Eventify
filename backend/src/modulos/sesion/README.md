# Sesión, usuarios y operaciones del catálogo

Esta carpeta reúne las rutas relacionadas con las cuentas y las acciones de la persona que inició sesión.

- `sesion.rutas.js` permite iniciar sesión, consultar la sesión actual y cerrarla. Comprueba las credenciales contra los usuarios del almacén y guarda en la sesión el rol de la cuenta.
- `usuarios.rutas.js` permite a la administración consultar y crear cuentas. También proporciona la función que crea un perfil de participante o ponente a partir de una cuenta existente.
- `publico.rutas.js` permite a una persona con sesión consultar o confirmar su propia inscripción y consultar o marcar sus notificaciones. Estas acciones utilizan la identidad de la sesión.

El catálogo de eventos es público y se define en el módulo de Eventos. Consultar o crear una inscripción propia requiere iniciar sesión con el rol `USUARIO`. La gestión de cuentas y recursos administrativos requiere el rol `ADMIN`.

## Inscripción y último cupo

El navegador solicita la inscripción y muestra la confirmación después de recibir una respuesta exitosa. El servidor procesa la consulta de cupos y la inscripción dentro de una transacción del almacén. La cola del almacén atiende las escrituras de una en una y guarda cada cambio antes de iniciar la siguiente.

Si la cuenta pertenece al ponente asignado al evento, la consulta y la solicitud de inscripción propia devuelven `409` con el código `PONENTE_ASIGNADO`. La comprobación usa el ID de usuario del perfil de ponente. Se conserva cualquier inscripción existente y el mismo usuario puede inscribirse en otros eventos si cumple las condiciones de disponibilidad.

Si dos personas solicitan el último cupo a la vez, una recibe la confirmación y la otra recibe el error 409 con el mensaje de que ya no hay cupos. La segunda solicitud consulta el estado guardado por la primera. Si la persona todavía no tiene perfil de participante, una solicitud rechazada no lo crea.

Esta coordinación corresponde a una sola instancia del backend. Para ejecutar varias instancias se necesitaría un almacén compartido con transacciones entre procesos.
