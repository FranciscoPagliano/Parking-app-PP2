# Estado del onboarding del compañero

Fecha: 6 de octubre de 2026. Estado: **listo para trabajar en desarrollo local**. Queda pendiente la revisión del autor y la integración de los cambios.

## Código y entorno

- Carpeta: `C:\Users\ASUS\Documents\ChatGPT\Parking-PP2`.
- Repositorio: `https://github.com/GuilleSantaCruz/parking-app.git`.
- Rama propia: `feature/onboarding-companero`.
- Commit base: `3951a33c6f03385d6555122b5f479545d57a8183`, «Creo endpoint de crear usuario y configuro jwt». Verificado mediante fetch en `origin/feature/backend-base`.
- La carpeta inicialmente contenía un repositorio vacío. El usuario confirmó que no había clonado y autorizó usar esta carpeta. Se preservaron los otros proyectos.
- Windows 11 Home, 64 bits, 10.0.26200; Git 2.46.2.windows.1.
- Node **24.21.0**, npm **11.19.0**. Node se actualizó desde 22.20.0 con el [instalador oficial](https://nodejs.org/en/download), verificando SHA-256 y firma OpenJS Foundation. La instalación elevada terminó con código 0; el primer intento sin elevación había fallado con 1730/1603.
- El lockfile exige, entre otros rangos, `^22.22.3 || ^24.15.0 || >=26.0.0`; la versión instalada cumple.
- Docker CLI/motor **29.7.2**, Compose **v5.5.1**. Docker ya estaba instalado, fuera del PATH de esta terminal; no se reinstaló.
- No se encontraron archivos AGENTS.md aplicables en las carpetas revisadas.

## Configuración local y cambios

El código funcional se obtuvo de Git, incluidos auth, usuarios, health, Prisma y migraciones. También están database, docs, mobile y web; las aplicaciones móvil y web aún no están implementadas.

- Se crearon `.env` y `backend/.env`, con valores coherentes y JWT generado con 32 bytes criptográficamente aleatorios. Ambos están ignorados y ninguno está versionado. No se publica su contenido.
- `.git/config`: `http.sslBackend=schannel` solo para este repositorio, resolviendo el error de certificados de Git con los certificados de Windows. TLS permanece habilitado.
- MySQL: contenedor `parking-app-mysql`, imagen `mysql:8.4`, puerto 3307, volumen propio `parking-pp2_mysql-data`. Se preservaron los volúmenes preexistentes `parking-app_mysql-data` y `expense-tracker_expense_mysql_data`.
- `backend/package-lock.json`: **25 líneas agregadas**, entradas faltantes de `@emnapi/core@1.11.3` y `@emnapi/runtime@1.11.3`. El usuario autorizó aplicar la propuesta y continuar. Ninguna versión de paquete existente ni dependencia declarada cambió.
- `backend/tsconfig.json`: `rootDir: "."` explícito para resolver TS5011 en tests con TypeScript 6. El build conserva su `rootDir: "./src"` en tsconfig.build.json. [Referencia oficial](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html#rootdir-now-defaults-to-).
- `backend/src/app.controller.spec.ts` y `backend/test/app.e2e-spec.ts`: expectativa actualizada de “Hello World!” a “Genio!!”, respuesta que ya estaba en el commit base. No se cambió el comportamiento de la aplicación.
- Documentos creados: este reporte y `docs/PRUEBAS_MANUALES.md`.
- Auxiliares locales ignorados en `qa_onboarding/`: script y resultados HTTP, auditoría npm, copia de manifiestos y parche del lockfile. No contienen tokens ni contraseñas.
- Se restituyó únicamente el archivo incremental `backend/tsconfig.build.tsbuildinfo` generado durante las comprobaciones a su contenido inicial, para no mezclar caché de compilación con los cambios revisables.

## Resultados ejecutados

| Comprobación | Resultado real |
| --- | --- |
| Fetch, commit y rama propia | Correcto |
| MySQL | Healthy |
| `npm ci` | Correcto: 652 paquetes instalados |
| `npm ls @nestjs/core @nestjs/cli` | Core 12.0.1 y CLI 12.0.0 |
| `prisma validate` | Correcto |
| `prisma generate` | Cliente 6.19.3 generado |
| `prisma migrate deploy` | Aplicada `20261001132105_crear_modelo_inicial` |
| `prisma migrate status` | Base actualizada; una migración, ninguna pendiente |
| `npm run build` | Correcto |
| `npm test -- --runInBand` | 1 suite y 1 test aprobados, con NODE_OPTIONS indicado abajo |
| `npm run test:e2e -- --runInBand` | 1 suite y 1 test aprobados, con la misma opción |
| Pruebas HTTP | **14 de 14 aprobadas**; detalle en PRUEBAS_MANUALES.md |

Las pruebas HTTP verificaron health, registro sin contraseña en respuesta, login con token y rol Usuario, duplicados conjuntos y por campo, contraseña incorrecta, permisos sin token y con rol Usuario, email inválido, contraseña corta, campo ausente y campo adicional. Health final: `status: ok`, `database: connected`, `usuarios: 1`.

Se confirmó que el puerto 3000 pertenecía al proceso de esta copia: `C:\Users\ASUS\Documents\ChatGPT\Parking-PP2\backend\dist\main`. Antes de iniciarlo no había otro listener en ese puerto.

Usuario ficticio conservado: ID **1**, nombre **Prueba Onboarding**, DNI **955934251**, email **onboarding.1791319401307-0c8336@example.com**. Contraseña aleatoria y token se usaron solo en memoria. El contador pasó de 0 a 1; no se borraron registros ni se crearon administradores.

## Errores resueltos y observaciones pendientes

1. npm inicialmente falló por `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. `NODE_USE_SYSTEM_CA=1` permitió HTTPS al registro con los certificados confiables de Windows, sin desactivar TLS.
2. Después, `npm ci` produjo EUSAGE por las dos entradas faltantes del lockfile. Se preparó una propuesta aislada, se verificó en seco y, tras autorización del usuario, se aplicó. La instalación real pasó. No se borró el lockfile ni se usó `--force`.
3. Los tests primero fallaron por TS5011, después por soporte ESM desactivado en Jest y finalmente por la expectativa desactualizada del saludo. Se resolvieron los tres problemas; el código funcional del backend permanece igual.
4. Jest requiere `NODE_OPTIONS=--experimental-vm-modules` para cargar Nest 12 en este entorno. Sin esa opción, el comando de tests falla por ESM. Node emite el aviso experimental correspondiente. [Documentación oficial de Jest](https://jestjs.io/docs/ecmascript-modules).
5. `npm audit` informó **33 vulnerabilidades: 2 bajas, 22 moderadas, 8 altas y 1 crítica**, contando dependencias directas/transitivas y herramientas de desarrollo. La crítica reportada afecta a `proxy-addr` ([aviso](https://github.com/advisories/GHSA-jqcg-44mw-7w3h)). Esto no demuestra por sí solo explotación en la aplicación. Detalle local: `qa_onboarding/npm-audit.json`. Coordinar con el autor una tarea de evaluación y actualización; no se ejecutó `npm audit fix`.
6. npm avisó que cinco paquetes tienen scripts de instalación aún sin política allowScripts explícita. Instalación, generación Prisma, build y pruebas finalizaron correctamente; no se añadió una autorización global de scripts.
7. Los tests versionados son básicos y comprueban el saludo; las comprobaciones de registro, login y permisos se ejecutaron aparte por HTTP.

## Inicio y detención

**Quedaron MySQL y el backend ejecutándose.** Backend iniciado con `npm.cmd run start:dev`, sesión administrada 44395. API: `http://localhost:3000`; health: `http://localhost:3000/health`. No iniciar una segunda instancia mientras esta siga activa.

Para futuros arranques, abrir Docker Desktop y ejecutar en PowerShell:

```powershell
cd 'C:\Users\ASUS\Documents\ChatGPT\Parking-PP2'
$env:Path = 'C:\Users\ASUS\AppData\Local\Programs\DockerDesktop\resources\bin;' + $env:Path
$env:NODE_USE_SYSTEM_CA = '1'
docker compose up -d
docker compose ps
cd backend
npx.cmd prisma migrate deploy
npm.cmd run start:dev
```

Si cambian dependencias, ejecutar primero `npm.cmd ci`; si cambia el esquema, regenerar con `npx.cmd prisma generate`. No crear migraciones nuevas solo para arrancar un clon.

Para comprobar build y tests desde backend, en otra terminal:

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
$env:NODE_OPTIONS = '--experimental-vm-modules'
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
```

Ctrl+C detiene un backend iniciado en tu terminal. Para detener la sesión administrada actual, pedirle a Codex que detenga el backend de este proyecto (sesión 44395). Desde la raíz, `docker compose stop` detiene MySQL conservando los datos. No usar `down -v` ni `prisma migrate reset`.

## Trabajo compartido

La primera tarea del compañero, documentar y ejecutar pruebas manuales, está preparada **para revisar**. Hay resultados reproducibles y datos ficticios identificados en PRUEBAS_MANUALES.md.

Siguiente paso: revisar con Guille el lockfile, la configuración de tests y los resultados; luego acordar una validación pequeña con su DTO/servicio, casos válidos e inválidos y criterio de aceptación. Coordinar además la auditoría de dependencias. Una tarea activa por persona.

Los cambios quedaron locales, sin commit, push, PR ni merge. Mientras la base no esté integrada en main, un PR dependiente debe apuntar a `feature/backend-base`. La integración y la revisión del autor siguen pendientes; el entorno local ya está comprobado.
