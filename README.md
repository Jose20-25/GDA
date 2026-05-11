# GDA — Cadenas de Cánticos

Portal estático para el equipo de música y alabanza de GDA. Permite gestionar las cadenas de cánticos por día de servicio y ver el calendario de rotación. Funciona completamente en el navegador sin necesidad de servidor.

## Estructura

```
index.html          ← Página principal (equipo y navegación)
public/
  miercoles.html
  viernes.html
  domingo.html
  vigilias.html
  db.js             ← Almacenamiento local (IndexedDB + localStorage)
  app.js            ← Lógica de páginas de día
  home.js           ← Lógica de la página principal
  nav.js            ← Barra de navegación
  calendario.js     ← Calendario de cadenas
  styles.css
  nav.css
  logo/gda.png
```

## Almacenamiento

| Dato | Dónde |
|---|---|
| PDFs de cánticos | IndexedDB del navegador |
| Integrantes del equipo | localStorage del navegador |

Los datos se guardan localmente en cada dispositivo/navegador. No se sincronizan entre dispositivos.

## Publicar en GitHub Pages

1. Sube el repositorio a GitHub
2. Ve a **Settings → Pages**
3. Fuente: rama `main`, carpeta **`/ (root)`**
4. La URL será `https://TU-USUARIO.github.io/REPO/`
