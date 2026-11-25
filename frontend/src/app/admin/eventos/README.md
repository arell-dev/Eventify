# Eventos

Administración de eventos en Angular y Bootstrap. Sus rutas cuelgan de `/admin/eventos` e incluyen listado, detalle, alta y edición.

Las páginas contienen la lógica de cada recorrido. Los componentes de indicadores y tablas muestran los datos recibidos. El servicio consume `/api/eventos` y sus relaciones con ponentes e inscripciones. La navegación y el Toast pertenecen a la aplicación y la confirmación reutiliza el diálogo de Inscripciones.

Las tres referencias visuales de Mauricio se encuentran en el mapa de `DESIGN.md`. El detalle abre el alta existente de Inscripciones con `eventoId` y vuelve a consultar los cupos al regresar.
