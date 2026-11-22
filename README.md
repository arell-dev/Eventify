# Eventify

Eventify es una aplicación académica para la consulta y gestión de eventos universitarios. Permitirá consultar eventos públicamente y administrar eventos, participantes, inscripciones y ponentes desde un área con acceso restringido.

## Integrantes

- Barrutia Ojeda Mauricio
- Mendoza Sacsa Zamira Luana
- Guevara Guerrero Ashley
- Jimenez Chinchay Mateo Sebastian

## Tecnologías

- Angular 20.3, TypeScript y Bootstrap 5.3.9 para la interfaz.
- Node.js 24 y Express 5 para la API REST.
- Archivos JSON para la persistencia local prevista.

## Arquitectura

El proyecto contiene `frontend/` y `backend/`, cada uno con sus propias dependencias. Ambas aplicaciones se organizan por funcionalidades. Los cuatro módulos administrativos son Eventos, Participantes, Inscripciones y Ponentes. El catálogo público y la sesión administrativa cuentan con espacios propios.

El catálogo permitirá consultar el listado en `/eventos` y el detalle en `/eventos/:id`, mediante los endpoints públicos `/api/publico/eventos` y `/api/publico/eventos/:id`. Las páginas administrativas estarán bajo `/admin` y sus endpoints requerirán una sesión válida, también para las consultas. El proxy de Angular dirige las solicitudes `/api` al servidor local.

Esta versión contiene el arranque técnico. Los módulos, el catálogo, la sesión y la persistencia están pendientes de desarrollo.

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

## Verificación

Ejecuta `npm.cmd test` en `backend/` y `npm.cmd run build` en `frontend/`. El archivo `backend/peticiones.http` contiene solicitudes para comprobar la API inicial.
