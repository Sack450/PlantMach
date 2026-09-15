# PlantMatch — Inteligencia Botánica y Compatibilidad

PlantMatch es una aplicación web interactiva que evalúa las condiciones reales de tu hogar (clima, iluminación, humedad, riego, tipo de espacio y seguridad para mascotas) y recomienda las especies compatibles con esas condiciones, con un módulo aparte para diagnosticar si una especie puntual sobreviviría en tu entorno.

> Esta rama (`fix/selectores-default-y-modal-ficha`) contiene la versión corregida y funcional del proyecto: rutas reparadas, evaluador con filtrado real, geolocalización, ficha de detalle por planta y sin vulnerabilidades conocidas. Ver `BITACORA.md` para el historial completo de cambios.

## Características principales

- **Evaluador en tiempo real**: filtra el catálogo cruzando simultáneamente clima, luz, humedad, riego, tipo de espacio (interior/exterior) y seguridad para mascotas. Recalcula al instante ante cualquier cambio de filtro.
- **Geolocalización real**: botón "Usar mi ubicación" que usa la API de geolocalización del navegador y estima la zona climática (tropical, mediterránea, oceánica o continental) a partir de la latitud — una aproximación explícita, no un dato meteorológico exacto, y sin depender de ninguna API externa de pago.
- **Catálogo interior/exterior**: 16 especies verificadas (10 de interior, 6 de exterior), cada una con imagen, dificultad, requerimientos de luz/humedad/riego y compatibilidad con mascotas.
- **Ficha de detalle ("Ver ficha")**: modal con la información completa de cada especie.
- **Diagnóstico de supervivencia**: consulta una especie puntual y avisa explícitamente cuando no la reconoce, en lugar de mostrar datos aproximados sin advertirlo.
- **Filtro de seguridad para mascotas** y búsqueda rápida con chips.
- **Navegación dinámica (scroll spy)**: el menú resalta la sección activa según el scroll.
- **Catálogo externo opcional (desactivado por defecto)**: hay soporte para ampliar el catálogo vía la API de Perenual, pero requiere una clave propia (`app.js`, función `fetchExternalPlants`) que no se distribuye en el repositorio.

## Tecnologías utilizadas

- HTML5 semántico
- Tailwind CSS (vía CDN + configuración personalizada en `tailwind.config.js`)
- JavaScript vanilla (ES6+, async/await, Fetch API) — sin frameworks ni build
- Google Fonts & Material Symbols

## Instalación y configuración local

1. Clona este repositorio:
   ```
   git clone https://github.com/Sack450/PlantMach.git
   ```
2. Cambia a esta rama:
   ```
   git checkout fix/selectores-default-y-modal-ficha
   ```
3. Todos los archivos viven en la raíz del proyecto (no hay carpetas `js/` ni `css/`):
   - `index.html`
   - `app.js`
   - `styles.css`
   - `tailwind.config.js`
   - `plants.json`
4. La geolocalización requiere un contexto seguro (HTTPS o `localhost`); no funciona abriendo `index.html` directamente con `file://`. Levanta un servidor local, por ejemplo:
   ```
   python3 -m http.server
   ```
   y abre `http://localhost:8000`.

## Limitaciones conocidas

- La estimación de clima es solo por latitud (no distingue costa, altitud ni microclimas).
- Sin backend, base de datos ni pruebas automatizadas; Tailwind se carga por CDN.
- El catálogo actual son 16 especies cargadas manualmente; no está enfocado en flora nativa de una región en particular.

## Créditos

Proyecto desarrollado como parte de soluciones interactivas de ingeniería web aplicada al hogar.
