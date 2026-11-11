# Decisiones de seguridad e identidad

Fecha: 11 de noviembre de 2026. Alcance: Etapa 2 de la copia independiente `Smart-Parking-Francisco`.

## Identidad

- Se conservan `Usuario`, `Empleado` y `Dueno`. No se agrega una tabla `Cuenta`: hoy no hay escrituras comunes para los tres perfiles y una tabla central exigiría migrar relaciones y flujos de creación sin una necesidad actual.
- Toda sesión identifica una cuenta por `tipoCuenta + idCuenta`. El claim `sub` conserva esa composición (`Cliente:123`, `Empleado:123` o `Dueno:123`), además de `email`, `rol` y `estado`.
- `POST /auth/login` requiere `tipoCuenta` (`Cliente`, `Empleado` o `Dueno`). La cuenta se busca solo en su tabla y las respuestas de credenciales incorrectas, cuenta inexistente o inactiva son iguales.
- Los emails se recortan y pasan a minúsculas en el registro y el login. Se permiten emails iguales en perfiles distintos, porque el tipo de cuenta es un discriminador obligatorio y las tres entidades son identidades independientes. La unicidad de la base sigue impidiendo duplicados dentro de cada tabla. No hay una consulta global propensa a carreras ni se intenta fusionar cuentas existentes.
- `Dueno.estado` se agregó con una migración aditiva y `DEFAULT 'Activo'`, para que los dueños actuales sigan habilitados sin reescritura de datos personales.

## Sesiones

- JWT de una hora, firmado con `JWT_SECRET` local de al menos 32 caracteres. El secreto de muestra hace fallar el arranque; los `.env` reales permanecen ignorados por Git.
- En cada ruta protegida, el guard valida firma, vencimiento, composición de claims, identidad en la tabla del tipo y estado actual. La desactivación o cambio de email invalida el token inmediatamente.
- El login limita a cinco intentos consecutivos por IP, email normalizado y tipo de cuenta durante 15 minutos; el éxito reinicia el contador. El contador vive en memoria del proceso. Para varias instancias se debe sustituir por un almacén compartido (por ejemplo Redis); no existe revocación individual de tokens mientras la cuenta siga activa.

## Autorización

- Los roles se separan como `Cliente`, `Empleado` y `Dueno`; no se usa `Administrador` como alias ambiguo de propietario.
- `GET /usuarios` requiere sesión. Devuelve únicamente el perfil propio al cliente; rechaza empleados y dueños porque no hay un vínculo de recurso que limite qué clientes podrían consultar.
- `AuthorizationService` contiene comprobaciones reutilizables de propiedad para vehículos, reservas, estadías, pagos y notificaciones de cliente; asignación de empleado a playa; y propiedad de playa por dueño. Las rutas comerciales implementadas en Etapa 3 reutilizan estas comprobaciones y filtran los datos por titular.
- Las pruebas de acceso a otra cuenta/playa ejercitan esas políticas unitarias. No se declara probado un endpoint comercial que todavía no existe.

## Configuración y exposición

- CORS lee una lista separada por comas desde `CORS_ORIGINS`. Vacía por defecto significa que el navegador no recibe permiso de origen; no se inventó una URL de React.
- `GET /health` confirma `SELECT 1` y responde solo estado/conexión; no informa el número de clientes ni errores internos de base.
- No se habilita `trust proxy`; la IP de rate limit depende de la conexión observada directamente por Express. Una futura instalación detrás de proxy debe configurar proxies confiables de forma explícita.

## Dependencias

- Se actualizaron transitivos dentro de rangos ya declarados y sin `--force`. Prisma 6 queda fijado en 6.19.3; el advisory de `deepmerge-ts` requiere Prisma 7 según el plan de npm. El salto de major queda pendiente de una migración/revisión específica.
- Los tres hallazgos altos restantes pertenecen al árbol de Prisma 6 y requieren evaluar Prisma 7; se detallan en `docs/ETAPA_2_SEGURIDAD.md`. Los overrides de `tmp` y `undici` afectan exclusivamente tooling de desarrollo; el comando `nest deploy` no se ejecutó y debe comprobarse si se usa en el futuro.
