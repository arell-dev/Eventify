# Ponentes

Gestión administrativa de ponentes desde el padrón y consulta de sus agendas.

| Ruta relativa a `/admin/ponentes` | Uso |
| --- | --- |
| `/` | Buscar por nombre o correo, filtrar por especialidad o agenda y eliminar con confirmación. |
| `/nuevo` | Buscar usuarios elegibles, revisar su ficha y confirmar el alta. |
| `/:id` | Consultar los datos del ponente y el horario y estado de sus eventos. |
| `/:id/editar` | Actualizar nombre, correo y especialidad. El usuario vinculado se conserva. |

El listado obtiene el conteo de cada ponente mediante su endpoint de agenda y distingue entre un resultado de cero y una consulta que falló. El alta envía solo el ID del usuario seleccionado. La edición valida el mismo texto recortado que luego envía y muestra junto al correo los conflictos informados por la API.

Las vistas siguen las tres referencias de Ashley con los estilos, la navegación y el Toast de Eventify. Los indicadores, la edición y la eliminación cubren operaciones del proyecto que no aparecen en la maqueta. El padrón usa opciones de radio y datos de la API. Las tablas se convierten en listas con etiquetas visibles cuando el espacio disponible es estrecho. La agenda muestra la hora peruana y conserva el lugar y el enlace cuando están disponibles.
