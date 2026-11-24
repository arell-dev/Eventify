# Inscripciones

El módulo registra y consulta inscripciones, cambia su estado y elimina únicamente las canceladas.

## Rutas

- `GET /api/inscripciones`: lista registros con los datos de evento y participante.
- `GET /api/inscripciones/:id`: consulta un registro por ID.
- `POST /api/inscripciones`: crea o reactiva una inscripción si el evento futuro tiene cupo.
- `PATCH /api/inscripciones/:id`: cancela o reactiva una inscripción.
- `DELETE /api/inscripciones/:id`: elimina una inscripción cancelada.

Todas las rutas requieren `req.session.usuario`. El middleware de sesión debe registrarse antes del router en `src/app.js`. Las modificaciones aceptan solicitudes del origen `http://localhost:4200`.

## Datos

Los datos iniciales compartidos están en `src/datos/data.json`. `src/comun/almacen.js` los copia a `backend/datos/eventify.json` solo cuando el archivo de trabajo todavía no existe. Eventos y Participantes deben usar este mismo almacén para conservar las relaciones por ID y la disponibilidad de cupos.
