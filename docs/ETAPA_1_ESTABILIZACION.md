# Etapa 1 — Estabilización y puesta en marcha

Fecha: 11 de noviembre de 2026.

## Resultado

La copia independiente queda conectada a MySQL 8.4 y el backend NestJS inicia correctamente. MySQL está saludable en `localhost:3308`, con el contenedor `smart-parking-francisco-mysql` y el volumen `smart_parking_francisco_mysql_data`. Nest está iniciado en `localhost:3000` contra la base de desarrollo `smart_parking_francisco`. El último `GET /health` devolvió HTTP 200, `database: connected` y cero clientes en desarrollo.

Se creó también `smart_parking_francisco_test` en el mismo contenedor aislado, se otorgó al usuario local permiso únicamente sobre esa base, y se aplicó la migración allí. La prueba HTTP creó un único cliente ficticio en esa base; no se insertaron datos de prueba en desarrollo.

## Entorno y Prisma

- Node.js `v24.21.0`; npm `11.19.0`.
- Docker CLI `29.7.2`; Compose `v5.5.1`.
- `npm ci` completó con el lockfile existente; `npm ls --depth=0` confirmó dependencias instaladas. No cambió `package.json` ni `package-lock.json` durante esta etapa.
- Se generó Prisma Client `6.19.3` y `prisma validate` confirmó que el esquema es válido.
- `prisma migrate status` mostró una migración pendiente en cada base nueva. Se aplicó `20261001132105_crear_modelo_inicial` tanto en desarrollo como en pruebas mediante `prisma migrate deploy`. El estado final de ambas bases es actualizado.
- La configuración efectiva de Compose se comprobó sin imprimir credenciales: imagen MySQL 8.4, puerto publicado 3308, contenedor y volumen exclusivos.
- Se generaron secretos aleatorios locales para la contraseña de la base y JWT en `.env` y `backend/.env`. `git check-ignore` confirmó ambos archivos ignorados. Ningún valor secreto se guardó en Git ni se incluyó en este documento.

## Verificaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| `npm ci` y `npm ls --depth=0` | Instalación correcta; árbol directo verificado |
| `npx prisma generate` | Correcto, Prisma Client 6.19.3 |
| `npx prisma validate` | Correcto |
| `npm run lint` | Correcto, sin diagnósticos |
| `npm run build` | Correcto |
| `npm test -- --runInBand` | 1 suite y 1 test aprobados |
| `npm run test:e2e -- --runInBand` | 1 suite y 1 test aprobados contra la base de pruebas |
| `prisma migrate status` en desarrollo y pruebas | Ambas bases actualizadas, una migración cada una |
| `docker compose ps` | MySQL `healthy`, publicado en 3308 |
| Smoke HTTP de `GET /`, `/health`, `POST /usuarios`, `/auth/login` y `GET /usuarios` | 14/14 aserciones aprobadas en la base de pruebas |
| `GET /health` con API apuntando a desarrollo | HTTP 200; DB conectada; cero clientes |

Los tests Jest requieren `NODE_OPTIONS=--experimental-vm-modules` en este entorno; Node imprime una advertencia experimental. La prueba e2e versionada comprueba solo `GET /`. El smoke HTTP adicional sí comprobó el `ValidationPipe` global con un campo extra.

El smoke HTTP verificó: saludo `Genio!!`; health antes (0 clientes); listado sin token (401); registro válido (201 y respuesta sin contraseña); login válido (201 y rol Usuario); listado con token de cliente (403); contraseña incorrecta (401); rechazo de propiedad adicional `rol` (400); y health final (1 cliente de prueba). La contraseña y el JWT de prueba no se imprimieron ni conservaron. El registro ficticio permanece únicamente en `smart_parking_francisco_test`.

## Comandos ejecutados

- `node --version`, `npm --version`, `docker --version`, `docker compose version`.
- `npm.cmd ci`, `npm.cmd ls --depth=0`, `npm.cmd audit --json` y `npm.cmd explain` para revisar instalación y árbol de dependencias.
- `$env:NODE_USE_SYSTEM_CA='1'; npx.cmd prisma generate` y `$env:NODE_USE_SYSTEM_CA='1'; npx.cmd prisma validate`.
- `docker compose config --format json` (solo se reportaron contenedor, imagen, puerto y volumen), `docker compose up -d`, `docker compose ps` y comprobación interna `mysqladmin ping`.
- `npx.cmd prisma migrate status` y `npx.cmd prisma migrate deploy` contra desarrollo; los mismos comandos con `DATABASE_URL` temporalmente dirigido a la base de pruebas.
- `npm.cmd run lint`, `npm.cmd run build`, `$env:NODE_OPTIONS='--experimental-vm-modules'; npm.cmd test -- --runInBand` y `npm.cmd run test:e2e -- --runInBand` (este último con `DATABASE_URL` de pruebas).
- Solicitudes HTTP reales desde PowerShell a `/`, `/health`, `/usuarios` y `/auth/login`; solo se conservó el resumen de estados, sin contraseña ni token.
- `git status`, `git remote -v`, `git diff --check` y `git check-ignore` para validar aislamiento y ausencia de secretos versionados.

El primer `npm ci` y los primeros comandos Prisma fallaron bajo el sandbox por acceso de red/certificados. Los reintentos autorizados terminaron correctamente con el almacén de certificados del sistema; no se deshabilitó TLS. `docker desktop start` reportó que faltaba una clave de registro; se abrió la instalación local de Docker Desktop y el motor quedó disponible.

## Dependencias y seguridad inicial

Se ejecutó `npm audit --json` contra el lockfile instalado. npm reportó 37 vulnerabilidades: 2 críticas, 9 altas, 20 moderadas y 6 bajas; el comando devuelve estado 1 por estos hallazgos. No se actualizó ninguna dependencia en esta etapa para evitar una actualización amplia sin analizar compatibilidad.

- Crítica en `proxy-addr@2.0.7`, dependiente de Express 5.2.1 y `@nestjs/platform-express` 12.0.1: es parte del árbol de producción. La corrección publicada es `proxy-addr` 2.0.8. Revisar también cualquier futura configuración `trust proxy`.
- Crítica en `handlebars@4.7.9`, dentro del árbol de desarrollo usado por `ts-jest`.
- Entre los hallazgos altos figuran `@nestjs/platform-express` 12.0.1, Prisma / `@prisma/config` 6.19.3, `multer`, `body-parser`, `undici` de `@nestjs/mau` y `tmp`.

La primera instalación y generación de Prisma fallaron bajo el sandbox por DNS y certificados. Se reintentaron con acceso a los registros oficiales y `NODE_USE_SYSTEM_CA=1`; la instalación y generación terminaron correctamente. No se desactivó la validación TLS.

El CLI `docker desktop start` no encontró una clave de registro de Docker Desktop en esta instalación. Se inició la aplicación local instalada; el motor respondió como Docker Desktop 29.7.2 y Compose pudo crear el contenedor dedicado. En las comprobaciones desde el sandbox, el acceso a TCP local y a la named pipe de Docker requirió las operaciones aprobadas fuera del sandbox.

## Archivos y cambios

Modificados en esta etapa:

- `README.md`: instrucciones reproducibles para MySQL, Prisma, Nest y pruebas aisladas.
- `docs/AUDITORIA_INICIAL.md`: conserva el diagnóstico original y agrega este resultado.

Creado:

- `docs/ETAPA_1_ESTABILIZACION.md` (este informe).

Se conservaron las modificaciones heredadas de `backend/package-lock.json`, `backend/tsconfig.json`, las expectativas de tests y los documentos de onboarding. Build y cliente Prisma generaron únicamente contenido ignorado/local. No hubo cambios a módulos Nest, reglas comerciales, esquema Prisma ni migración.

## Seguridad y pendientes conocidos

- `main.ts` aplica el `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform`; bcryptjs usa factor 10; el JWT expira en una hora y exige un secreto local.
- `/usuarios` responde 401 sin token y 403 a un cliente. La ruta sí permite a roles Empleado y Administrador consultar todos los clientes, sin aislamiento por playa ni por recurso. No habilitarla para producción aún.
- El health check público incluye el contador de clientes.
- No hay rate limiting de login, CORS restringido, revocación de JWT ni revalidación de estado de la cuenta en cada solicitud.
- El login busca en varias tablas por email; emails entre tablas y los IDs no son globalmente únicos.
- El manejo explícito de error de registro traduce P2002 a 409. No hay filtro global de errores ni auditoría.
- El test e2e importa `AppModule` directamente y no verifica el `ValidationPipe` de `main.ts`; la aserción HTTP manual del campo adicional sí respondió 400.
- La auditoría npm encontró hallazgos críticos/altos; no se han corregido. Evaluar actualizaciones puntuales en una tarea controlada y repetir build/tests.
- No existen frontend web, módulos de playas/cocheras/reservas/estadías/pagos, ni pruebas de concurrencia.

No se ejecutó un reset, borrado ni migración destructiva. La carpeta original y su base siguen fuera de esta etapa.

## Ejecución desde VS Code

1. Abrir `Smart-Parking-Francisco` como carpeta de trabajo.
2. Asegurarse de que Docker Desktop esté iniciado.
3. En la primera terminal, desde la raíz, ejecutar `docker compose up -d` y confirmar `docker compose ps` muestra `healthy` en 3308.
4. En otra terminal, entrar a `backend/` y ejecutar `npm.cmd run start:dev`.
5. Abrir `http://localhost:3000/health`.

El backend y MySQL quedan actualmente en ejecución. Para detener Nest, usar Ctrl+C en su terminal. `docker compose stop` detiene MySQL conservando el volumen y los datos.

---

## Continuación de seguridad — Etapa 2

El diagnóstico y los resultados históricos de Etapa 1 se conservan como registro de esa etapa. La identidad, permisos, rate limit, CORS, migración aditiva de estado de Dueño y pruebas de seguridad posteriores están documentados en [ETAPA_2_SEGURIDAD.md](ETAPA_2_SEGURIDAD.md) y [DECISIONES.md](DECISIONES.md). Los resultados de auditoría npm de Etapa 1 reflejan el lockfile previo; el recuento posterior a las actualizaciones puntuales se registra en el informe de Etapa 2.
