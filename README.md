# Eventify

Eventify es una aplicación académica para la consulta y gestión de eventos universitarios. Incluye catálogo público, cuentas con roles y gestión administrativa de eventos, participantes, inscripciones y ponentes.

## Integrantes

- Barrutia Ojeda Mauricio
- Mendoza Sacsa Zamira Luana
- Guevara Guerrero Ashley
- Jimenez Chinchay Mateo Sebastian

## Tecnologías

- Angular 20.3, TypeScript y Bootstrap 5.3.9 para la interfaz.
- Node.js 24 y Express 5 para la API REST.
- Archivos JSON para la persistencia local de la API.

## Arquitectura

El proyecto contiene `frontend/` y `backend/`, cada uno con sus propias dependencias. Ambas aplicaciones se organizan por funcionalidades. Las fichas de participantes y ponentes enlazan sus inscripciones y eventos.

Las vistas administrativas están bajo `/admin`. El almacén JSON compartido conserva usuarios, perfiles, eventos, inscripciones y notificaciones entre reinicios. El proxy de Angular dirige las solicitudes `/api` al servidor local. Los usuarios pueden iniciar sesión en `/acceso` para inscribirse y consultar las notificaciones de ponente.

El administrador inicial es Anthony Paul Tavara Ramos, con correo `C25170@utp.edu.pe` y la contraseña indicada para la demostración. La API administrativa permite crear cuentas. Las pantallas de alta de Participantes y Ponentes seleccionan cuentas del padrón y vinculan los perfiles por identificador.

## Requisitos

Instala Node.js 24 y npm. En Windows, los comandos siguientes usan `npm.cmd`.

## Inicio local

En una terminal, desde la raíz del repositorio:

```powershell
cd backend
npm.cmd ci
npm.cmd start
```

En otra terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd start
```

La interfaz estará disponible en `http://localhost:4200` y la API en `http://localhost:3000`. El endpoint `GET /api/estado` permite comprobar el servidor y el proxy.

La primera ejecución prepara `backend/src/datos/eventify.json` con los datos iniciales. Las contraseñas se guardan como derivaciones con sal. Las cuentas de demostración de participantes y ponentes con acceso usan `Eventify2026!`. Las notificaciones a ponentes se muestran dentro del catálogo al iniciar sesión.

## Verificación

Ejecuta `npm.cmd test` en `backend/` y `npm.cmd run build` en `frontend/`. La carpeta `backend/peticiones/` contiene solicitudes organizadas para comprobar la API.
