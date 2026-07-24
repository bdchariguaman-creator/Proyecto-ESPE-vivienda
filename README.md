# RoomiU ESPE

Plataforma web de vivienda estudiantil para la ESPE Latacunga: búsqueda con mapa geolocalizado, publicación de viviendas con fotos reales, mensajería interna, reseñas con reputación, y verificación administrativa de arrendadores.

## Arquitectura

- **Backend:** Node.js + Express, con autenticación por sesión de servidor (cookies firmadas) y contraseñas cifradas con bcrypt.
- **Base de datos:** SQLite real y persistente en disco (`roomiu.sqlite`), accedida mediante el módulo nativo `node:sqlite` incluido en Node.js — no requiere instalar ni compilar ningún motor de base de datos aparte.
- **Archivos:** las fotos de las publicaciones y los documentos de verificación (cédula, predial, matrícula, récord policial, rol de pagos) se guardan como archivos reales en `uploads/`, servidos por el propio servidor.
- **Frontend:** HTML, CSS y JavaScript que consumen el API REST del backend mediante `fetch`, sin dependencias de framework.
- **Mapas:** Leaflet + teselas de OpenStreetMap (requieren conexión a internet en el navegador).

## Requisitos

- Node.js 22.5 o superior (usa el módulo `node:sqlite`, disponible desde esa versión).

## Instalación y ejecución

```bash
cd RoomiU
npm install
npm start
```

El servidor queda escuchando en `http://localhost:3000`. Ábrelo en el navegador.

La primera vez que se ejecuta, el servidor crea automáticamente el archivo `roomiu.sqlite` con el esquema de tablas y una base de datos de ejemplo. Las siguientes ejecuciones reutilizan esos mismos datos (persisten entre reinicios del servidor).

Para reiniciar la base de datos a los datos de ejemplo originales:

```bash
npm run seed:reset
```

## Cuentas de acceso

| Rol | Correo | Contraseña |
|---|---|---|
| Estudiante | estudiante@espe.edu.ec | 123456 |
| Arrendador verificado | arrendador@roomiu.ec | 123456 |
| Arrendador pendiente de verificación | carmen@roomiu.ec | 123456 |
| Administrador | admin@roomiu.ec | admin123 |

## Estructura del proyecto

```
RoomiU/
  server/            Backend (Express, base de datos, rutas del API, subida de archivos)
    db.js            Esquema SQL y datos de ejemplo
    routes/          Endpoints REST agrupados por módulo
  public/            Frontend (HTML, CSS, JS) servido por Express
  uploads/           Fotos de viviendas y documentos subidos por los usuarios
  roomiu.sqlite       Base de datos (se crea automáticamente al iniciar)
```

## Trazabilidad de requerimientos funcionales

- **Módulo 1 – Usuarios y autenticación:** registro diferenciado por rol con validación de campos, correo único y documentos reales de respaldo (RF-001, RF-002); inicio de sesión con verificación de credenciales cifradas y mensajes que no revelan si el correo existe (RF-003); recuperación de contraseña de extremo a extremo con token de un solo uso (RF-004); edición de perfil para estudiante y arrendador sin permitir cambiar el correo (RF-005); control de acceso por rol en cada endpoint del servidor, no solo en la interfaz (RF-006); cierre de sesión que destruye la sesión en el servidor (RF-025).
- **Módulo 2 – Publicaciones:** alta y edición con 2 a 10 fotos reales subidas al servidor y ubicación elegida en un mapa interactivo (RF-007, RF-008); activar/desactivar sin eliminar (RF-009); eliminación definitiva que conserva las reseñas asociadas en el historial del arrendador (RF-010).
- **Módulo 3 – Búsqueda y visualización:** filtros combinables (precio, tipo, distancia, servicios, calificación) resueltos en el servidor, con orden por relevancia, precio o distancia (RF-011); mapa interactivo real con marcadores clicables (RF-012); detalle completo con galería de todas las fotos (RF-013); favoritos persistentes en la base de datos, asociados a la cuenta (RF-014).
- **Módulo 4 – Reseñas y reputación:** solo puede reseñar quien tuvo contacto previo (mensaje o visita) con la vivienda, una reseña por publicación (RF-015); promedio automático por vivienda y por arrendador, recalculado en cada consulta (RF-016); reportes de publicaciones y de reseñas (RF-017).
- **Módulo 5 – Mensajería:** chat interno entre estudiante y arrendador sin exponer datos de contacto externos (RF-018); bandeja de conversaciones con indicador de no leídos (RF-019); notificación visual (badge) de mensajes nuevos (RF-020).
- **Módulo 6 – Verificación y administración:** aprobación o rechazo de arrendadores con revisión de los documentos reales subidos, y notificación al usuario en su siguiente inicio de sesión (RF-021); gestión de cuentas (activar, desactivar, eliminar) con motivo obligatorio y registro de auditoría (RF-022); moderación de reportes con opción de mantener, ocultar o eliminar el contenido, y aviso cuando una publicación o reseña acumula varios reportes (RF-023); panel con métricas generales, barras visuales de resumen y nuevos registros por período (RF-024).

## Notas técnicas

- Las contraseñas se almacenan cifradas con bcrypt; nunca en texto plano.
- Las sesiones son manejadas por el servidor (`express-session`) mediante una cookie firmada; el secreto de firma se genera automáticamente si no se define la variable de entorno `SESSION_SECRET`.
- El mapa (Leaflet + OpenStreetMap) requiere conexión a internet en el navegador de quien usa la aplicación; el resto del sistema (autenticación, publicaciones, mensajería, reseñas, administración) funciona completamente en local, sin depender de servicios externos.
- Variables de entorno opcionales: `PORT` (por defecto 3000) y `SESSION_SECRET`.
