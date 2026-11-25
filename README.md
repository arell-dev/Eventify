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

La API administrativa permite crear cuentas. Las pantallas de alta de Participantes y Ponentes seleccionan cuentas del padrón y vinculan los perfiles por identificador.

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

## Datos de demostración

La primera ejecución carga las [semillas](backend/src/datos/datos-iniciales/) y crea el almacén `backend/src/datos/eventify.json`. Cada cuenta usa el `correo` y la `contrasena` de su registro en [`usuarios.json`](backend/src/datos/datos-iniciales/usuarios.json). Para consultar las credenciales de demostración en PowerShell, ejecuta esto desde la raíz del repositorio:

```powershell
Get-Content -Raw -Encoding UTF8 backend/src/datos/datos-iniciales/usuarios.json |
  ConvertFrom-Json |
  Format-List nombre, correo, rol, contrasena
```

| Cuenta de ejemplo | Correo | Ruta de acceso | Qué puedes probar |
| --- | --- | --- | --- |
| Administrador | `C25170@utp.edu.pe` | `/admin/acceso` | Entrar al panel y gestionar eventos, perfiles e inscripciones. |
| Participante | `U24270382@utp.edu.pe` | `/acceso` | Consultar su inscripción confirmada en **Inteligencia artificial aplicada** (`/eventos/2`). |
| Ponente | `C242103@utp.edu.pe` | `/acceso` | Abrir la campana de notificaciones y comprobar el aviso de ponente asignado en **Introducción a Angular 20** (`/eventos/1`). |

El backend conserva el almacén existente entre reinicios. Para empezar con las semillas actuales, detén la API, mueve `backend/src/datos/eventify.json` a un lugar de respaldo fuera del repositorio e inicia la API de nuevo. Si existe el almacén de una versión anterior en `backend/datos/eventify.json`, respáldalo también fuera del repositorio antes de reiniciar.

## Verificación

Ejecuta `npm.cmd test` en `backend/` y `npm.cmd run build` en `frontend/`. La carpeta `backend/peticiones/` contiene solicitudes organizadas para comprobar la API.
