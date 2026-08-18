# Ruleta One

Ruleta virtual de premios con panel de administración y registro de participantes.

- **Panel interno** (protegido por contraseña) para crear y configurar múltiples ruletas: premios, probabilidades, colores, formulario de datos y publicación.
- **Link por ruleta** para que los participantes jueguen (`index.html#jugar=<id>`).
- **Backend en Google Apps Script + Google Sheets**: guarda la configuración de cada ruleta y cada jugada (participante + premio ganado).

## Estructura

```
index.html        → aplicación completa (frontend)
apps-script.gs    → backend para Google Apps Script (Google Sheets)
img/              → logo y favicon
```

## Puesta en marcha

### 1. Backend (una sola vez)
1. Crear una hoja de cálculo en Google Sheets.
2. **Extensiones → Apps Script** y pegar el contenido de `apps-script.gs`.
3. Cambiar `ADMIN_PASSWORD` por una contraseña propia.
4. **Implementar → Nueva implementación → Aplicación web**
   - Ejecutar como: *Yo*
   - Quién tiene acceso: *Cualquier usuario*
5. Copiar la URL `/exec`.

### 2. Frontend
1. En `index.html`, poner la URL del paso anterior en la constante `BACKEND_URL`.
2. Abrir `index.html` (o publicarlo en un hosting estático).

## Publicación

El proyecto es 100% estático: se puede publicar en **Netlify**, **GitHub Pages**, etc.
Subir `index.html` junto con la carpeta `img/`.

## Uso

1. Entrar al panel con la contraseña de administrador.
2. Crear una ruleta, configurar premios y (opcional) el formulario de datos.
3. **Publicar** y **copiar el link** para los participantes.
4. Los datos de cada jugada quedan registrados en la hoja de cálculo.
