# Etapa 3 — Backend comercial

Fecha: 11 de noviembre de 2026. Implementación en la copia individual de Francisco. No se desarrolló frontend, app móvil, reservas ni operaciones de entrada/salida de estadías.

## Modelos y migraciones

Se reutilizan los modelos existentes de Prisma: `PlayaEstacionamiento`, `Dueno`, `Empleado`, `Usuario`, `Vehiculo`, `Tarifa`, `Cochera`, `Reserva`, `Estadia`, `Pago` y `Notificacion`. **No hizo falta cambiar el esquema ni generar una migración de Etapa 3.** Las migraciones previas de identidad siguen aplicadas.

La capacidad limita el alta de cocheras y no puede reducirse por debajo del número existente. La creación de cocheras y el cambio de capacidad bloquean la fila de la playa dentro de una transacción serializable para evitar exceder el cupo con altas simultáneas.

Los horarios REST son `HH:mm`, en formato de mismo día (apertura anterior a cierre); MySQL `TIME` se serializa de vuelta como `HH:mm`. Importes de tarifa entran como strings decimales y se persisten con `Prisma.Decimal`; se rechazan valores negativos, cero y más de dos decimales.

## Contratos REST

El prefijo de API es `/`. Nest devuelve JSON y usa códigos HTTP estándar: `200` consultas/cambios, `201` altas, `400` DTO inválido, `401` sin sesión, `403` rol o alcance insuficiente, `404` recurso fuera de la ruta solicitada/no encontrado y `409` duplicado o conflicto de estado/relación.

### Playas

| Método y ruta | Acceso | Uso |
|---|---|---|
| `GET /playas/publicas` | Público | Listado con contacto, horario, capacidad y cocheras configuradas |
| `GET /playas/publicas/:id` | Público | Ficha pública |
| `GET /playas` | Dueño/Empleado | Playas propias o playa asignada |
| `GET /playas/:id` | Dueño/Empleado | Detalle scoped más resumen de estados de cocheras |
| `POST /playas` | Dueño | Crear; `idDueno` se deriva del JWT |
| `PATCH /playas/:id` | Dueño propietario | Actualizar datos, capacidad, horarios y reservas |

Ejemplo de alta: `nombre`, `direccion`, `telefono`, `horaApertura`, `horaCierre`, `capacidad`, `permiteReservas`. No acepta `idDueno` del cliente.

### Empleados

Todas las rutas las administra el dueño de la playa indicada. `POST /playas/:playaId/empleados` crea cuenta asignada desde la ruta; `GET /playas/:playaId/empleados` lista; `GET` y `PATCH /playas/:playaId/empleados/:id` consultan/cambian datos permitidos; `PATCH .../:id/estado` activa/desactiva; `PATCH .../:id/traslado` cambia de playa solo si el mismo dueño administra playa actual y destino. DTOs nunca aceptan contraseña, DNI, estado o playa arbitrarios en el cambio de perfil. La contraseña solo se define al alta y nunca se devuelve.

### Clientes e historial

- `GET /usuarios/me` consulta el perfil propio.
- `PATCH /usuarios/me` permite nombre, apellido, email, teléfono y ciudad; DNI, estado y rol son inmutables en esta ruta.
- `GET /usuarios/me/historial` entrega las últimas 20 reservas, estadías, pagos y notificaciones propias por colección.
- `GET /usuarios` se conserva como alias seguro del perfil propio por compatibilidad.

### Vehículos

`GET/POST /vehiculos` lista y registra vehículos propios. `GET/PATCH /vehiculos/:id` aplica filtro por `idUsuario` derivado del token. Patente se normaliza a mayúsculas y sin espacios/guiones; admite 6–9 caracteres alfanuméricos. La unicidad global de patente de MySQL se traduce a `409`. No hay borrado físico para conservar relaciones históricas.

### Tarifas

`GET /playas/:playaId/tarifas` expone las tarifas de esa playa. El dueño propietario puede crear por `POST` y modificar descripción/precio por `PATCH /playas/:playaId/tarifas/:tarifaId`. Una tarifa no se puede alterar mientras haya una estadía activa que dependa de ella. Las estadías finalizadas conservan el importe guardado en `Estadia.montoTotal`. No hay eliminación física de tarifas referenciadas.

### Cocheras

- `GET /playas/:playaId/cocheras/disponibles` lista solo cocheras operativamente disponibles y su tarifa.
- `GET /playas/:playaId/cocheras` y `GET .../:id` requieren dueño propietario o empleado asignado.
- Los listados admiten `limite` (por defecto 50, máximo 100) y `cursor` (ID de la última cochera entregada); responden `{ data, paginacion: { limite, cursorSiguiente, hayMas } }`.
- `POST /playas/:playaId/cocheras` y `PATCH .../:id` requieren dueño propietario. Alta verifica capacidad, número único en la playa y que la tarifa pertenezca a esa misma playa.
- Si una cochera tiene estadía activa, no se puede cambiar su estado ni tarifa; en particular no se permite liberar una ocupada. Las reservas futuras no alteran el estado operativo.

No se implementó ningún endpoint que cree estadías ni reservas. Si se agregan en otra etapa, la operación que crea una estadía debe coordinarse con el bloqueo de la cochera usado al cambiar su estado.

## Autorización aplicada

- Dueño: las escrituras de playas, tarifas, cocheras y empleados verifican que el dueño de la playa sea el de la sesión. Traslados validan ambos extremos.
- Empleado: las lecturas de gestión comparan su `idPlaya` activo con el parámetro de ruta. No puede gestionar playas o empleados.
- Cliente: perfil e historial se filtran por `idCuenta`; vehículos se crean con ese ID y cada acceso individual exige coincidencia de titular.
- Los datos públicos se limitan a información de playas, tarifas y disponibilidad. Ninguna ruta usa el frontend para decidir la propiedad.

## Eliminaciones y pruebas

No se añadieron deletes físicos porque el esquema relaciona vehículos, tarifas, cocheras y playas con historiales. El borrado lógico disponible para empleado es `estado=Inactivo`. No se cambió esquema ni se ejecutaron migraciones durante Etapa 3; no se tocaron dependencias.

Build y lint:

```powershell
Set-Location backend
npm.cmd run build
npm.cmd run lint
```

Unitarias:

```powershell
$env:NODE_OPTIONS='--experimental-vm-modules'
npm.cmd test -- --runInBand
Remove-Item Env:NODE_OPTIONS
```

E2E solo sobre la base separada `_test`:

```powershell
$line = Get-Content .env | Where-Object { $_ -like 'DATABASE_URL=*' } | Select-Object -First 1
$env:DATABASE_URL = (($line -split '=', 2)[1] -replace '/smart_parking_francisco$', '/smart_parking_francisco_test')
$env:NODE_OPTIONS = '--experimental-vm-modules'
npm.cmd run test:e2e -- --runInBand
Remove-Item Env:DATABASE_URL
Remove-Item Env:NODE_OPTIONS
```

La suite e2e verifica dos dueños/playas y dos clientes, acceso cruzado, altas/cambios, DTOs, duplicados, estados, persistencia en MySQL, Decimal/historial, asignación de tarifas y ocupación por estadía. Comprueba el sufijo `_test` antes de levantar Nest y limpia solamente fixtures con IDs y emails generados para esa ejecución.

Resultado de la verificación final: build aprobado; lint aprobado; **26/26 unit tests** (10 suites); **18/18 e2e** (2 suites) sobre `smart_parking_francisco_test`. Ningún test apuntó a la base de desarrollo. No se ejecutaron migraciones ni actualizaciones de dependencias en esta etapa.

## Decisiones y límites

- La lista pública de playas es anónima; el listado y detalle de gestión requieren token scoped.
- El estado general de playa cuenta cocheras por estado. El esquema no tiene un estado independiente de playa.
- Historial limita a las 20 entradas más recientes por tipo; los listados de cocheras usan cursor para soportar playas grandes.
- No hay módulo comercial de estadías, reservas ni pagos; los datos de historial solo se consultan.
- La auditoría pendiente de Prisma 6 registrada en Etapa 2 queda fuera de alcance; en esta etapa no se actualizaron dependencias.
