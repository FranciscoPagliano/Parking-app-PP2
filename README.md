# Smart Parking — copia independiente

Proyecto académico de gestión de estacionamientos. Esta carpeta conserva la base NestJS/Prisma anterior y se prepara para continuar el desarrollo individual de Francisco Pagliano.

## Arquitectura acordada

- Aplicación web responsive con React y TypeScript.
- API REST con NestJS y TypeScript.
- MySQL 8.4, Prisma y Docker Compose.
- Tres perfiles: cliente, empleado y dueño.

`mobile/` se conserva por historial, pero no está dentro del alcance vigente. `web/` todavía no contiene una interfaz implementada.

## Requisitos

- Node.js 24 y npm 11.
- Docker Desktop iniciado, Docker Engine disponible y Docker Compose.
- PowerShell en Windows (los ejemplos usan `npm.cmd`).

## Primer arranque

1. Copiar la plantilla a los dos lugares que leen configuración:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item .env.example backend\.env
   ```

2. Reemplazar `JWT_SECRET` en ambos archivos por el mismo valor aleatorio de al menos 32 caracteres. Mantener `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `MYSQL_PORT` y `DATABASE_URL` coherentes entre ellos. `CORS_ORIGINS` queda vacío hasta conocer el origen de React; cuando exista, usar una lista separada por comas de orígenes explícitos. Los archivos `.env` están ignorados por Git; no subirlos.

3. Abrir Docker Desktop y esperar a que indique que el motor está iniciado. Desde esta carpeta, iniciar y revisar la base:

   ```powershell
   docker compose up -d
   docker compose ps
   ```

   Smart Parking usa el contenedor `smart-parking-francisco-mysql`, la base `smart_parking_francisco`, el puerto host `3308` y el volumen `smart_parking_francisco_mysql_data`.

4. Instalar dependencias, generar Prisma, revisar migraciones y aplicar solo las pendientes:

   ```powershell
   Set-Location backend
   npm.cmd ci
   npx.cmd prisma generate
   npx.cmd prisma migrate status
   npx.cmd prisma migrate deploy
   ```

   `migrate deploy` no borra ni recrea la base. No usar `prisma migrate reset`, `docker compose down -v` ni eliminar el volumen.

5. Iniciar la API:

   ```powershell
   npm.cmd run start:dev
   ```

   API: `http://localhost:3000`. Comprobar `GET /health`; debe responder `status: ok` y `database: connected`.

## Comprobaciones

Desde `backend/`:

```powershell
npm.cmd run lint
npm.cmd run build
$env:NODE_OPTIONS='--experimental-vm-modules'
npm.cmd test -- --runInBand
Remove-Item Env:NODE_OPTIONS
```

Para ejecutar e2e de forma aislada, crear una sola vez la base de pruebas y otorgar al usuario local acceso solo a ella. Desde la raíz, abrir el cliente MySQL como administrador:

```powershell
docker compose exec mysql mysql -uroot -p
```

Ingresar el `MYSQL_ROOT_PASSWORD` local y, en el prompt `mysql>`, ejecutar:

```sql
CREATE DATABASE IF NOT EXISTS smart_parking_francisco_test;
GRANT ALL PRIVILEGES ON smart_parking_francisco_test.* TO 'smart_parking_dev'@'%';
```

Después, desde `backend/`, apuntar el proceso e2e a esa base (no a desarrollo):

```powershell
$line = Get-Content .env | Where-Object { $_ -like 'DATABASE_URL=*' } | Select-Object -First 1
$env:DATABASE_URL = (($line -split '=', 2)[1] -replace '/smart_parking_francisco$', '/smart_parking_francisco_test')
$env:NODE_OPTIONS = '--experimental-vm-modules'
npx.cmd prisma migrate deploy
npm.cmd run test:e2e -- --runInBand
Remove-Item Env:DATABASE_URL
Remove-Item Env:NODE_OPTIONS
```

Las pruebas unitarias no requieren base. La suite e2e exige que `DATABASE_URL` apunte a `smart_parking_francisco_test`, comprueba el sufijo `_test` antes de iniciar y crea/elimina únicamente fixtures propios. Nunca ejecutar e2e contra `smart_parking_francisco`.

## Endpoints existentes

- `GET /`: respuesta de prueba `Genio!!`.
- `GET /health`: disponibilidad de MySQL sin datos internos.
- `POST /usuarios`: registro público.
- `POST /auth/login`: enviar `email`, `contrasena` y `tipoCuenta` (`Cliente`, `Empleado` o `Dueno`); devuelve JWT de una hora con identidad compuesta y perfil.
- `GET /usuarios`: alias compatible de `GET /usuarios/me`, requiere JWT de Cliente y devuelve solo su perfil.

## API comercial — Etapa 3

Los endpoints de gestión requieren Bearer JWT. La identidad del propietario/cliente se toma del token; el dueño solo opera sus playas y el empleado solo consulta la playa asignada. Las rutas públicas no devuelven datos de cuentas. Contratos completos y ejemplos están en [docs/ETAPA_3_BACKEND_COMERCIAL.md](docs/ETAPA_3_BACKEND_COMERCIAL.md).

- Playas: `GET /playas/publicas`, `GET /playas/publicas/:id`; gestión scoped `GET /playas`, `GET /playas/:id`, `POST /playas`, `PATCH /playas/:id`.
- Empleados: `POST/GET /playas/:playaId/empleados`; detalle y cambios mediante `/:id`, `/:id/estado` y `/:id/traslado` (solo dueño de la playa actual y destino).
- Clientes: `GET/PATCH /usuarios/me`, `GET /usuarios/me/historial`; `GET /usuarios` queda como alias del perfil propio.
- Vehículos: `GET/POST /vehiculos`, `GET/PATCH /vehiculos/:id` (solo titular).
- Tarifas: `GET/POST /playas/:playaId/tarifas`, `PATCH /playas/:playaId/tarifas/:tarifaId`. Los precios se envían como string decimal, por ejemplo `"12.50"`.
- Cocheras: `GET /playas/:playaId/cocheras` para dueño/empleado asignado; `GET /playas/:playaId/cocheras/disponibles` es público; alta y edición requieren dueño. Los listados aceptan `limite` y `cursor`.

No hay borrado físico de entidades ligadas a historial. Empleados se desactivan; playas, tarifas, vehículos y cocheras se conservan para proteger sus relaciones. La API no implementa todavía reservas ni altas/egresos de estadías.

El guard vuelve a consultar tipo, email y estado de la cuenta en cada petición protegida. El límite de login es de cinco intentos fallidos por IP, email y perfil cada 15 minutos; actualmente vive en memoria de una instancia. Consultar [docs/DECISIONES.md](docs/DECISIONES.md) y [docs/ETAPA_2_SEGURIDAD.md](docs/ETAPA_2_SEGURIDAD.md) para alcance y pendientes.

La migración de estado de Dueño es aditiva y se aplica con `prisma migrate deploy` al iniciar el proyecto. Ver [docs/AUDITORIA_INICIAL.md](docs/AUDITORIA_INICIAL.md), [docs/ETAPA_1_ESTABILIZACION.md](docs/ETAPA_1_ESTABILIZACION.md) y [docs/ETAPA_2_SEGURIDAD.md](docs/ETAPA_2_SEGURIDAD.md) para el historial y los resultados.

## Git y aislamiento

Se conservó el historial local para referencia, pero esta copia no tiene remoto de escritura configurado. No publicar ni agregar un remoto sin autorización expresa del responsable.
