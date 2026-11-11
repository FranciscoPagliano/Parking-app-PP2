# Auditoría inicial de Smart Parking

Fecha de revisión: 11 de noviembre de 2026. Alcance: copia local y revisión estática. No se iniciaron servicios, no se ejecutaron pruebas ni migraciones y no se consultó ni modificó ninguna base de datos.

## Origen y aislamiento

- Fuente identificada por su remoto Git: `C:\Users\ASUS\Documents\ChatGPT\Parking-PP2`, cuyo `origin` era `https://github.com/GuilleSantaCruz/parking-app.git`.
- Destino: `Smart-Parking-Francisco/`, dentro del espacio de trabajo individual.
- Se copió el árbol de trabajo completo, los archivos ocultos y el historial Git local. Robocopy terminó con cero archivos fallidos.
- Se quitó `origin` solo de la copia. `git remote -v` queda vacío y no hay upstream configurado para la rama activa. No se hizo ninguna escritura en el origen ni se publicó nada.
- Rama copiada: `feature/backend-base`, commit `3951a33` (`Creo endpoint de crear usuario y configuro jwt`). En esta copia, `origin/main` del historial local aparece en `23907e4`, distinto de `3951a33`; por tanto, la fotografía anterior que decía que ambas referencias coincidían ya no describe el estado observado.
- La carpeta de trabajo abierta originalmente estaba vacía salvo por un `.git` sin commits. No se usó como fuente.

## Conservado y excluido

Se conservaron backend, esquema y migración Prisma, `docker-compose.yml`, documentación, carpetas `web/`, `mobile/` y `database/`, archivos de configuración y lockfile. También se copiaron los artefactos locales ignorados de `qa_onboarding/`, que contienen el reporte de auditoría npm anterior, un parche de lockfile, resultados HTTP sanitizados y un script de comprobación.

El estado local frente al commit copiado registra:

- Modificados: `backend/package-lock.json`, `backend/src/app.controller.spec.ts`, `backend/test/app.e2e-spec.ts` y `backend/tsconfig.json`.
- Eliminado en el árbol de origen: `backend/tsconfig.build.tsbuildinfo` (archivo de estado incremental generado).
- Sin seguimiento: `docs/ESTADO_ONBOARDING_COMPANERO.md` y `docs/PRUEBAS_MANUALES.md`.

No se descartaron los documentos ni los cambios locales. El README de Nest incluido es el archivo genérico del framework; los documentos de onboarding y pruebas describen la configuración histórica y se preservan como evidencia, no como instrucciones para reutilizar el entorno anterior.

Se excluyeron los archivos `.env` de la raíz y de `backend/`, que contienen configuración local y secretos, junto con el artefacto incremental `*.tsbuildinfo`. No se copiaron `node_modules`, `dist`, `coverage` ni `mysql-data` si existían. No se copió ni reutilizó ningún volumen o dato de MySQL. `.env.example` usa nombres y puerto exclusivos de esta copia, con marcadores que deben reemplazarse localmente antes de arrancar la API. Compose exige las contraseñas configuradas en el `.env`; el repositorio no aporta credenciales predeterminadas.

## Cambios de preparación realizados en la copia

- Compose usa contenedor `smart-parking-francisco-mysql`, volumen explícito `smart_parking_francisco_mysql_data` y puerto de host predeterminado `3308`, evitando colisión con el nombre y puerto del entorno antiguo.
- `.env.example` apunta a una base de desarrollo llamada `smart_parking_francisco` y contiene un marcador para el secreto JWT local.
- El README raíz documenta el alcance web acordado, el estado real, la preparación local y la ausencia de remoto Git.

Estos cambios solo preparan configuración y documentación; no inicializan servicios ni datos.

## Inventario funcional

### Implementado en la base actual

- NestJS arranca la API en el puerto de `PORT` o 3000 y aplica `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform`.
- Prisma conecta y desconecta el cliente al iniciar/cerrar el módulo.
- Registro público de clientes en `POST /usuarios`, hash de contraseña con bcryptjs (factor 10), selección de respuesta sin contraseña y duplicados Prisma P2002 convertidos a HTTP 409.
- Login en `POST /auth/login`, JWT con vencimiento de una hora, guard Bearer y guard de roles.
- `GET /health` comprueba la base contando usuarios.
- Endpoints de prueba `GET /` y listado protegido por rol `GET /usuarios`.
- Un esquema Prisma de 11 modelos y una migración inicial MySQL: Usuario, Vehiculo, Dueno, PlayaEstacionamiento, Empleado, Cochera, Tarifa, Reserva, Estadia, Pago y Notificacion.
- Compose declara MySQL 8.4 con healthcheck.

### Incompleto o con riesgo

- El login busca primero Usuario, luego Empleado y luego Dueño. Los emails solo son únicos dentro de cada tabla, así que un email repetido entre tablas produce una identidad ambigua. El JWT solo guarda ID numérico, email y rol; los IDs autoincrementales no son globales.
- El guard valida firma/expiración y rol, pero no vuelve a consultar si la cuenta fue desactivada. Dueño ni siquiera tiene estado en el esquema.
- `GET /usuarios` permite a cualquier Empleado o Administrador listar todos los datos de clientes, sin filtrar por playa, necesidad operativa ni permiso por recurso.
- La validación de alta solo impone strings no vacíos, email y longitud mínima de contraseña. No normaliza entradas ni valida DNI, teléfono, longitud máxima o espacios. No hay rate limiting ni CORS restringido.
- `GET /health` expone un contador de usuarios innecesario para un health check público.
- `Estadia` exige Usuario y Vehiculo, por lo que el modelo no admite de forma coherente entradas manuales de vehículos sin cuenta. `Vehiculo` también exige dueño usuario.
- Las relaciones no garantizan que el vehículo de una reserva pertenezca al usuario, que una tarifa pertenezca a la misma playa que la cochera, ni que un pago apunte exactamente a una reserva o estadía.
- El esquema no impone solapamiento de reservas, una sola estadía activa por cochera/patente, compatibilidad vehículo-cochera ni idempotencia de cobros. Una consulta seguida de una inserción no resolvería esas carreras.
- Cochera usa `Disponible/Ocupado/FueraDeServicio`; no separa estado físico de reserva comercial ni conserva historial de asignaciones.
- Hay importes `Decimal`, pero no snapshots de tarifa ni política documentada de redondeo, tolerancias, zona horaria o precio histórico.
- No existe modelo de auditoría/incidencias, cierres, recibos, reembolsos o notificaciones operativas.
- `web/` y `mobile/` solo contienen `.gitkeep`. No existe interfaz React funcional. Mobile se conserva por historial, pero contradice la decisión vigente y no debe desarrollarse.
- No existen cámaras, tiempo real ni pasarela de pagos integradas.

### Pruebas y configuración

- La prueba unitaria y la e2e versionadas comprueban solo el saludo `Genio!!`.
- El test e2e importa `AppModule`, que inicia Prisma y requiere configuración JWT y una base alcanzable; no define una base de pruebas separada.
- El test e2e crea la aplicación directamente y no aplica la configuración HTTP de `main.ts`, por lo que no verifica el `ValidationPipe` global.
- El documento histórico `PRUEBAS_MANUALES.md` registra 14/14 respuestas HTTP aprobadas el 6 de octubre de 2026 contra otro proceso/base local. Es evidencia histórica, no ejecución en esta copia.
- No se ejecutaron pruebas, build, instalación, Docker ni migraciones en esta auditoría.

## Dependencias

El lockfile fija NestJS 12.0.1, Prisma 6.19.3 y TypeScript 6.0.2, entre otros. El cambio local del lockfile agrega entradas opcionales `@emnapi/core` y `@emnapi/runtime` 1.11.3; no cambia manifiestos ni versiones existentes. La documentación histórica indica que estas entradas se agregaron para corregir `npm ci`.

El archivo local `qa_onboarding/npm-audit.json` registra una auditoría de 6 de octubre de 2026 con 33 hallazgos (2 bajos, 22 moderados, 8 altos y 1 crítico). Ese recuento no debe tratarse como el estado actual. La versión fijada en el lockfile para `proxy-addr` es 2.0.7; el [aviso revisado de GitHub GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) indica que las versiones anteriores a 2.0.8 están afectadas por una validación incorrecta de subredes IPv4 mapeadas a IPv6, y fija 2.0.8 como versión corregida. El impacto requiere configurar una subred de proxy de confianza con el formato/prefijo defectuoso; la aplicación revisada no configura explícitamente `trust proxy`, pero se debe actualizar ese transitivo al evaluar dependencias y revisar la configuración de despliegue. Se intentó `npm audit --json` en esta copia el 11 de noviembre, pero npm no pudo resolver `registry.npmjs.org` (`ENOTFOUND`); por lo tanto no hay un recuento vigente completo. No se ejecutó `npm audit fix` ni se cambiaron dependencias.

## Qué se puede reutilizar

El esqueleto NestJS, el ciclo de vida de Prisma, DTO/validación global, hash de contraseña, flujo inicial de login y guards, esquema/migración de referencia, Compose MySQL y los documentos/manual de registro existentes sirven como punto de partida. Hay que corregir identidad y autorización antes de ampliar operaciones comerciales.

## Plan de trabajo propuesto

1. Cerrar decisiones del modelo de identidad (email compartido/global, tipo de cuenta, propietario sin cuenta) y preparar tests con base aislada antes de tocar entidades.
2. Endurecer DTOs, normalización, secretos, rate limiting, CORS, estado de sesión y acceso a recursos; corregir el listado de clientes y health.
3. Revisar esquema y migraciones de forma no destructiva para propiedad de vehículos, entradas anónimas, integridad de pagos, snapshots de tarifa e historial/auditoría.
4. Implementar playas, empleados, vehículos, tarifas y cocheras con permisos por propietario/playa.
5. Implementar estadías e ingresos/egresos con transacciones y restricciones de concurrencia.
6. Implementar disponibilidad y reservas con intervalos, tolerancias configurables y protección concurrente.
7. Implementar pagos manuales, saldos, idempotencia y comprobantes.
8. Construir el frontend React responsive de los tres perfiles, conectado solo a datos reales.
9. Añadir notificaciones, estadísticas, pruebas de seguridad/concurrencia y preparar entrega reproducible. Tiempo real y cámaras quedan posteriores hasta tener una operación confiable y hardware real.

No se cambió ninguna regla de negocio ni se implementaron funcionalidades durante esta etapa.

---

## Resultado de Etapa 1 — 11 de noviembre de 2026

Se instaló el lockfile sin editar manifiestos, se generó Prisma Client 6.19.3, el esquema pasó `prisma validate` y ambos comandos de migración finalizaron con una migración aplicada. La base de desarrollo `smart_parking_francisco` y la base de pruebas `smart_parking_francisco_test` están en el contenedor MySQL 8.4 dedicado, puerto host 3308, volumen `smart_parking_francisco_mysql_data`. El healthcheck está en `healthy`.

Se generaron `.env` locales para la raíz y `backend/`, ambos ignorados por Git. Contienen contraseñas aleatorias de desarrollo y un secreto JWT aleatorio; sus valores no se documentan. La API Nest está actualmente ejecutándose en `localhost:3000` con la base de desarrollo. Su health actual es HTTP 200, base conectada, contador 0.

Resultados reales: lint aprobado; build aprobado; 1/1 test unitario aprobado; 1/1 test e2e aprobado usando exclusivamente la base de pruebas; 14/14 aserciones HTTP aprobadas contra la API iniciada con esa base de pruebas. El smoke incluyó `GET /`, health, registro sin contraseña en la respuesta, login, ruta protegida sin token y con token de Cliente, credenciales incorrectas y rechazo de una propiedad extra. El registro ficticio permanece solamente en la base de pruebas. Los tests Jest requieren `NODE_OPTIONS=--experimental-vm-modules` en este entorno.

Se ejecutó una auditoría npm vigente sobre el lockfile: 37 hallazgos (6 bajos, 20 moderados, 9 altos y 2 críticos); npm retorna código 1 porque informó vulnerabilidades. Los críticos son `proxy-addr@2.0.7` (dependencia de Express/`@nestjs/platform-express`, árbol de producción) y `handlebars@4.7.9` (árbol dev de `ts-jest`). Entre los hallazgos altos figuran `@nestjs/platform-express@12.0.1`, Prisma/`@prisma/config@6.19.3`, `multer`, `body-parser`, `undici`, `tmp` y otros. No se actualizaron paquetes; se deben evaluar correcciones puntuales y repetir verificaciones.

Nest conserva los riesgos listados en el diagnóstico anterior: listado de clientes sin alcance por establecimiento, health que revela cantidad de clientes, sesiones JWT que no se revalidan contra estado actual, login ambiguo entre tablas, falta de rate limiting/CORS restringido/auditoría global y modelo que no soporta todavía todos los flujos. El e2e versionado solo prueba `GET /` y crea la app sin el `ValidationPipe` global; el smoke HTTP confirmó el rechazo de campos adicionales a través de `main.ts`.

La auditoría de Etapa 1 está ampliada en [ETAPA_1_ESTABILIZACION.md](ETAPA_1_ESTABILIZACION.md), que incluye comandos reproducibles, incidencias de red/certificados y guía para VS Code. No se ejecutaron migraciones destructivas, no se eliminaron datos y no se tocó el repositorio ni la base compartida.
