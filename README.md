# RoomiU ESPE

Plataforma web para la búsqueda y gestión de vivienda estudiantil cerca de la ESPE Latacunga. Frontend en HTML, CSS y JavaScript puro, con persistencia en el navegador (localStorage/sessionStorage) para simular backend y sesiones mientras se implementa el servidor definitivo.

## Cómo abrir

1. Descomprime la carpeta `RoomiU`.
2. Abre `index.html` en el navegador (necesitas conexión a internet para cargar el mapa real de OpenStreetMap/Leaflet).
3. Para revisar los roles, usa `login.html` o crea una cuenta nueva en `registro.html`.

## Accesos de revisión académica

- Estudiante: `estudiante@espe.edu.ec` / `123456`
- Arrendador verificado: `arrendador@roomiu.ec` / `123456`
- Arrendador pendiente de verificación: `carmen@roomiu.ec` / `123456`
- Administrador: `admin@roomiu.ec` / `admin123`

Puedes borrar los datos de prueba y volver al estado inicial ejecutando `localStorage.clear()` en la consola del navegador y recargando la página.

## Trazabilidad de requerimientos funcionales (RF-001 a RF-025)

- **Módulo 1 – Usuarios y autenticación:** registro diferenciado por rol con validaciones y documentos reales (RF-001, RF-002), login por rol con control de acceso estricto por sesión (RF-003, RF-006), recuperación de contraseña simulada (RF-004), gestión de perfil para estudiante y arrendador (RF-005), cierre de sesión seguro (RF-025).
- **Módulo 2 – Publicaciones:** creación y edición con fotos reales (2 a 10) y ubicación geolocalizada elegida en un mapa interactivo (RF-007, RF-008), activar/desactivar y eliminar publicaciones (RF-009, RF-010).
- **Módulo 3 – Búsqueda y visualización:** filtros combinables en tiempo real (RF-011), mapa interactivo real (OpenStreetMap/Leaflet) con marcadores clicables (RF-012), detalle completo de la vivienda (RF-013), favoritos persistentes (RF-014).
- **Módulo 4 – Reseñas y reputación:** reseñas restringidas a estudiantes con contacto previo (mensaje o visita) con la vivienda (RF-015), promedio automático por vivienda y por arrendador (RF-016), reportes de publicaciones y de reseñas (RF-017).
- **Módulo 5 – Mensajería:** chat interno estudiante–arrendador (RF-018), gestión de conversaciones con indicador de no leídos (RF-019), notificación visual (badge) de mensajes nuevos (RF-020).
- **Módulo 6 – Verificación y administración:** aprobación/rechazo de arrendadores con notificación al usuario (RF-021), gestión de cuentas con motivo y registro de auditoría (RF-022), moderación de reportes con opción de eliminar contenido y aviso de reportes múltiples (RF-023), panel con métricas generales incluidos nuevos registros (RF-024).

## Pendiente de implementar (fuera del alcance de este avance)

- Backend real (PHP/Node) y base de datos MySQL/Postgres persistente en servidor.
- Cifrado de contraseñas con bcrypt y sesiones server-side.
- Pasarela de pagos real y envío de correos (recuperación de contraseña, notificaciones).
- Integración institucional para validar matrícula.
- Aplicación externa de instrumentos SUS y cuestionario de experiencia de usuario.

## Notas técnicas

- El mapa usa Leaflet + teselas de OpenStreetMap desde CDN; requiere conexión a internet. Sin conexión, se muestra un mensaje de respaldo en lugar de fallar.
- Las fotos y documentos se guardan como base64 dentro de `localStorage`, por lo que conviene usar imágenes livianas en las pruebas.
- Los datos de ejemplo se reinician automáticamente si cambia la estructura interna de la base de datos simulada (clave `roomiu.db.v2`).
