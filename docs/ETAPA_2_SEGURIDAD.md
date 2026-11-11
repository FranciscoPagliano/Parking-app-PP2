# Etapa 2 — Seguridad, identidad y autorización

Fecha: 11 de noviembre de 2026. Revisión e implementación en la copia independiente de Francisco. No se avanzó a módulos de negocio ni frontend.

## Hallazgos iniciales

- El login buscaba en secuencia tres tablas con email único solo dentro de cada una y emitía un token con ID numérico ambiguo.
- El guard verificaba firma y vencimiento, pero no consultaba la cuenta ni su estado actual. `Dueno` no tenía estado.
- `GET /usuarios` permitía a empleados y dueños listar clientes sin alcance por recurso.
- No había límite de intentos, origen CORS explícito ni DTO suficientemente acotado. `/health` revelaba el total de clientes.
- No existen todavía endpoints de vehículos, reservas, estadías, pagos, notificaciones o gestión de playas/empleados; no es posible afirmar una prueba HTTP de autorización para esas rutas.

## Cambios

- Login pide tipo de perfil y firma `sub`, `idCuenta`, `tipoCuenta`, `rol`, `email` y `estado`. Usa búsqueda tipada, errores genéricos, normalización de email y límites de cinco fallos por ventana de 15 minutos.
- JWT dura una hora. Cada solicitud protegida vuelve a leer la cuenta en la tabla tipada y rechaza cuentas inexistentes/inactivas o tokens cuyo email dejó de coincidir.
- La identidad mantiene las tres tablas; no se introdujo `Cuenta`. Los emails idénticos entre perfiles son explícitos y permitidos, ya que el discriminador obligatorio elimina la ambigüedad. La unicidad de cada tabla sigue respaldada por MySQL.
- Se agregó `Dueno.estado` con default `Activo` mediante migración aditiva `20261111050000_dueno_estado`; aplicada en `smart_parking_francisco_test` y en desarrollo, sin borrar ni recrear datos.
- `GET /usuarios` devuelve solo el propio perfil para clientes. Empleados y dueños reciben 403 hasta que exista un alcance de recursos que limite la consulta. Las respuestas siguen usando selección explícita de campos.
- `AuthorizationService` ofrece filtros por propietario de recurso para cliente, asignación de empleado a playa y propiedad de playa por dueño. Hay tests unitarios de aislamiento. Los nuevos módulos deben usarla en cada acceso a datos.
- DTO de alta valida DNI argentino de 7–10 dígitos, teléfono, longitudes, espacios, email minúsculo, contraseña de 12–72 bytes y campos desconocidos. Se mantiene `ValidationPipe` global.
- CORS permite solo orígenes listados en `CORS_ORIGINS` (vacío por defecto). JWT_SECRET exige 32 caracteres como mínimo y rechaza la plantilla. Health devuelve solo `status` y `database`.

## Dependencias y auditoría

La primera auditoría vigente repitió 37 hallazgos: 2 críticos, 9 altos, 20 moderados y 6 bajos. Se actualizaron paquetes del lockfile dentro de los rangos ya declarados: `@nestjs/platform-express` y transitivos asociados, `handlebars`, `@nestjs/mau` y `brace-expansion`. Se fijaron overrides puntuales de tooling para `undici@6.29.1` y `tmp@0.2.7`, con el fin de eliminar los avisos altos; son dependencias de desarrollo y no se ejecutó el comando `nest deploy`, por lo que ese flujo debe verificarse si se usa. No se usó `npm audit fix --force`.

La auditoría final informó 25 hallazgos: 0 críticos, 3 altos, 18 moderados y 4 bajos. Los tres altos (`prisma`, `@prisma/config` y `deepmerge-ts`) son un mismo árbol: npm solo ofrece una corrección pasando a Prisma 7. No se hizo el salto mayor durante una etapa de seguridad que debe preservar el comportamiento estable de Prisma 6; se propone evaluarlo aparte con revisión de cambios y pruebas. No quedan hallazgos altos en dependencias de runtime Nest ni en tooling tras los parches. El lockfile se debe auditar otra vez al continuar, porque advisories y versiones cambian.

## Verificaciones ejecutadas

- `npx prisma validate`: aprobado.
- `npx prisma generate`: aprobado.
- `npx prisma migrate status` sobre `_test`: identificó una migración pendiente antes de aplicarla.
- `npx prisma migrate deploy` sobre `_test`: aplicó solamente `Dueno.estado`.
- `npx prisma migrate deploy` sobre desarrollo: aplicó la misma migración aditiva (un campo `estado` con default `Activo`), sin eliminar ni recrear tablas o datos.
- Build Nest y lint Oxlint: aprobados después del grupo de actualización de dependencias.
- Tests unitarios: 4 suites, 13/13 aprobados.
- E2E, ejecutado con `DATABASE_URL` apuntando a `smart_parking_francisco_test`: 1 suite, 10/10 aprobados.
- E2E incluye raíz, health, login de los tres perfiles con email e ID iguales, errores genéricos, estado desactivado, rate limit, tokens ausentes/alterados/vencidos, permisos de `/usuarios`, registro, propiedades privilegiadas y no exposición de hash.
- Tests unitarios adicionales cubren firma inválida y vencimiento del guard, IDs coincidentes, desactivación y checks de recursos cruzados.

Los tests crean fixtures ficticios de manera explícita y los eliminan por email/ID únicamente dentro de la base `_test`. No ejecutan limpieza general y no usan la base de desarrollo para pruebas.

## Limitaciones y pendientes

- Rate limit en memoria: no comparte contadores entre réplicas, no tiene persistencia después de reiniciar y puede ser evitado con distribución de IPs. Migrar a Redis antes de desplegar varias instancias.
- Sin revocación individual de JWT; la consulta de estado permite desactivar cuenta, pero un logout no invalida el token hasta vencer.
- La identidad de email global única no se adoptó: se permite repetir email en perfiles distintos porque `tipoCuenta` es obligatorio. Operaciones futuras deben mantener normalización y unicidad de email por tabla.
- La respuesta 403 de empleados/dueños en `/usuarios` es intencional hasta que exista una relación de recurso que permita filtrar clientes con necesidad operativa.
- Las funciones de autorización de recursos todavía no están conectadas a endpoints de negocio, que se excluyen de Etapa 2.
- Faltan políticas de lockout distribuido, verificación de email, recuperación de contraseña, MFA, auditoría de acciones y manejo de cambios de credenciales.
- Los altos transitivos restantes no se declararon corregidos; se requiere resolver compatibilidad o documentar exposición según el despliegue.

## Decisiones

Ver [DECISIONES.md](DECISIONES.md) para el detalle de identidad compuesta, emails, sesiones, autorización y CORS.
