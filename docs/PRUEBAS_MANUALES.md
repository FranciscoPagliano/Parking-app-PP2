# Pruebas manuales de registro, login y permisos

Base: `3951a33c6f03385d6555122b5f479545d57a8183`.
Entorno local: `http://localhost:3000`, MySQL propio en el puerto 3307.

## Preparación

Iniciar MySQL y el backend según `ESTADO_ONBOARDING_COMPANERO.md`.
Usar exclusivamente datos ficticios. Para cada nueva ejecución elegir email y DNI únicos.
Enviar cuerpos JSON con `Content-Type: application/json`.
Guardar contraseña y token únicamente en memoria; no incorporarlos a Git ni a este documento.

El registro válido incluye `nombre`, `apellido`, `dni`, `email`, `contrasena`
(mínimo ocho caracteres), `telefono` y `ciudad`. El login usa `email` y `contrasena`.

## Casos

| Caso | Pasos | Resultado esperado | Resultado obtenido |
| --- | --- | --- | --- |
| Salud | `GET /health` | 200; `status: ok`, `database: connected`, contador numérico | Aprobado: HTTP 200 |
| Registro válido | `POST /usuarios` con todos los campos válidos | 201; identificador, sin contraseña ni hash | Aprobado: HTTP 201 |
| Login válido | `POST /auth/login` con la cuenta creada | Éxito; token y perfil con rol `Usuario` | Aprobado: HTTP 201 |
| Registro duplicado | Repetir exactamente el registro | 409 | Aprobado: HTTP 409 |
| Email duplicado | Mantener email y cambiar DNI | 409 | Aprobado: HTTP 409 |
| DNI duplicado | Mantener DNI y cambiar email | 409 | Aprobado: HTTP 409 |
| Contraseña incorrecta | Login con email creado y otra contraseña | 401 | Aprobado: HTTP 401 |
| Listado sin token | `GET /usuarios` sin Authorization | 401 | Aprobado: HTTP 401 |
| Listado con rol Usuario | `GET /usuarios` con `Authorization: Bearer <token>` | 403 | Aprobado: HTTP 403 |
| Email inválido | Registro con email sin formato válido | 400 | Aprobado: HTTP 400 |
| Contraseña corta | Registro con contraseña de siete caracteres | 400 | Aprobado: HTTP 400 |
| Campo requerido ausente | Registro sin `nombre` | 400 | Aprobado: HTTP 400 |
| Campo adicional | Registro con propiedad `rol` | 400 | Aprobado: HTTP 400 |

## Seguimiento del equipo

Borrador local del tablero: Pendiente → En curso → Para revisar → Terminado.

- Responsable inicial: compañero. Tarea: documentar y ejecutar estos casos. Alcance: documentación de pruebas; aceptación: resultados reproducibles y sin secretos.
- Responsable de revisión: autor. Revisar resultados y acordar una validación pequeña antes de modificar DTO o servicio.
- Siguiente tarea: pendiente de acordar regla y alcance con el autor; no modificar reglas de negocio durante el onboarding.
- Una tarea activa por persona. No editar simultáneamente esquema, migraciones, dependencias, Docker o autenticación sin coordinación.
- Mientras la base no esté integrada en `main`, un PR dependiente apunta a `feature/backend-base` y explica esa dependencia. No se realiza push ni merge durante este onboarding.

## Ejecución del 6 de octubre de 2026

14/14 comprobaciones aprobadas, incluyendo health final (200, database connected, usuarios 1).
El contador inicial era 0. Se creó y conservó un único usuario ficticio: ID 1, Prueba Onboarding,
DNI 955934251, email onboarding.1791319401307-0c8336@example.com. No se guardaron contraseña ni token.

Registro: se comprobó un ID numérico y ausencia de contraseña/hash en la respuesta.
Login: HTTP 201, token y perfil Usuario con el mismo ID. El listado con ese token devolvió 403.
No hubo errores funcionales en estos casos. Los fallos de instalación y tests, con sus correcciones,
están registrados en ESTADO_ONBOARDING_COMPANERO.md.

Ejecutor local: `node qa_onboarding/verificar-http.cjs` desde la raíz, con el backend activo.
Cada ejecución crea otro usuario ficticio único; no borra registros. Resultados sanitizados:
`qa_onboarding/resultados-http.json`. Ambos archivos están ignorados por Git.

Estado del borrador de tablero: **Para revisar**. Responsable de revisión: autor.
