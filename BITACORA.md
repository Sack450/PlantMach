# Bitácora del proyecto — PlantMatch

Registro de contexto, decisiones y estado del proyecto para no perder el hilo entre sesiones. Última actualización: **2026-09-10**.

## 1. Qué es esto

PlantMatch es una app web estática (HTML + Tailwind CDN + JS vanilla, sin build) que evalúa las condiciones reales del hogar del usuario (clima, luz, humedad, riego, mascotas, ubicación) y recomienda plantas compatibles, con un módulo aparte para diagnosticar la supervivencia de una especie puntual.

**Repo original:** https://github.com/Sack450/PlantMach
**Fork de trabajo:** https://github.com/Eliaselnocapo/PlantMach
**Rama de trabajo:** `fix/rutas-funcionalidad-geolocalizacion`
**Pull Request abierto:** https://github.com/Sack450/PlantMach/pull/1

## 2. Objetivo real del producto (definido con el usuario)

La idea de fondo: una página que tome la ubicación del usuario y le diga qué plantas le convienen. Se decidió el alcance así:
- **Geolocalización**: real (vía navegador), pero estimada solo por latitud — sin depender de una API de clima externa. Es una aproximación explícita, no un dato meteorológico exacto.
- **Catálogo**: diferenciado en interior (maceta) y exterior (jardín), ambos con datos de clima real.

## 3. Estado al empezar (antes de tocar nada)

- La app estaba **rota**: `index.html` apuntaba a `js/app.js`, `css/styles.css`, `js/tailwind.config.js`, rutas que no existían (los archivos están en la raíz). Cero interactividad.
- El evaluador solo usaba 2 de 5 parámetros que mostraba en pantalla.
- Varios botones y enlaces eran decorativos (no hacían nada).
- El diagnóstico de supervivencia mentía: mostraba datos de Ficus para cualquier planta que no reconociera, sin avisar.
- Había una vía de inyección de HTML (XSS) con el texto que escribe el usuario.
- El "% de compatibilidad" de cada tarjeta era un número fijo o aleatorio, no calculado con las condiciones reales.

## 4. Qué se hizo (por commit)

1. **`84c2042`** — Corrige rutas rotas, repara funcionalidad del evaluador y agrega geolocalización
   - Fix de rutas (bug crítico).
   - Evaluador filtra de verdad por luz, humedad, riego, clima y ubicación (antes solo 2 de 5).
   - Recalcula en vivo al cambiar cualquier selector.
   - Corrige contador de plantas y botón "Calcular" (hardcodeados en 14).
   - Arregla chips rápidos "Principiantes" y "Purificadoras de aire".
   - Arregla navegación del footer (no llevaba a ninguna sección).
   - Elimina un botón "Ver todas las plantas" que no hacía nada.
   - Diagnóstico de supervivencia: avisa cuando no reconoce la especie en vez de fingir precisión; suma Pothos, ZZ Plant y Peperomia a la base.
   - Corrige XSS en el texto del usuario y en los datos de la API externa.
   - Evita una llamada de red que siempre fallaba (API externa sin key).
   - Muestra un mensaje si falla la carga del catálogo, en vez de pantalla en blanco.
   - **Geolocalización real**: botón "Usar mi ubicación", estima clima por latitud (tropical/mediterráneo/oceánico/continental).
   - **Nuevo selector interior/exterior** + 6 plantas de jardín con clima real (Lavanda, Olivo, Hortensia, Buganvilla, Arce Japonés, Hibisco Tropical).
   - Mensaje de "sin resultados" cuando la combinación de filtros no encuentra ninguna especie.

2. **`6b34964`** — Elimina el porcentaje de compatibilidad de las tarjetas
   - Se quita el badge "XX% Compatible" (no reflejaba las condiciones configuradas).
   - Se elimina `matchPercent` de `plants.json` y de la adaptación de la API externa.
   - Se ajustan textos que prometían un "porcentaje científico de adaptabilidad".

3. **`6ea9fa8`** — Corrige finales de línea de `index.html` a CRLF
   - Fix de un problema de formato (LF vs CRLF) que infló un diff sin necesidad. Sin cambio funcional.

4. **`a79624d`** — Corrige imágenes rotas y mal asignadas en el catálogo
   - Sansevieria, Pothos y Peperomia tenían URLs de Unsplash con 404 real.
   - Areca Palm mostraba el Coliseo de Roma en vez de una palmera.
   - Reemplazadas por fotos de Wikipedia Commons, verificadas visualmente antes de usarlas.

## 5. Cómo se verificó todo

No se validó solo leyendo código: se usó Playwright headless para levantar la app en un navegador real y probar interacción real — carga del catálogo, filtros combinados, geolocalización simulada en varias ciudades (Madrid, Londres, Reikiavik, Nairobi), caso de permiso de ubicación denegado, intento de XSS (bloqueado), navegación del footer, vista mobile (390px). Además se verificó cada una de las 16 URLs de imagen con petición HTTP directa (no solo desde el navegador).

## 6. Estado actual — qué funciona

- Carga sin errores de consola.
- Evaluador con filtrado real (luz, humedad, riego, clima, interior/exterior, mascotas).
- Geolocalización real por latitud, con manejo de permiso denegado.
- 16 plantas (10 interior + 6 exterior), todas con imagen correcta y funcionando.
- Diagnóstico de supervivencia con aviso de aproximación.
- Búsqueda rápida, chips, toggle mascotas, navegación completa (header + footer).
- Sin XSS conocido.

## 7. Pendiente / checklist para presentar

- [ ] **Actualizar el README**: todavía menciona carpetas `js/`/`css/` que no existen y "porcentaje de adaptabilidad científica" (ya eliminado). Desactualizado respecto al código actual.
- [ ] Decidir qué decir sobre lo que queda decorativo: botón "Ver ficha" por planta y formulario de newsletter no hacen nada todavía.
- [ ] Probar la app en un navegador real (no solo pruebas automatizadas), especialmente el botón "Usar mi ubicación".
- [ ] Tener plan B de red para la presentación (geolocalización e imágenes dependen de internet en vivo).
- [ ] Decidir si mergear el PR #1 a `main` antes de presentar.

## 8. Limitaciones conocidas (a propósito, no son bugs)

- La geolocalización requiere HTTPS o `localhost`; no funciona abriendo el HTML con `file://` directo.
- La estimación de clima es solo por latitud (no distingue costa/interior, altitud, ni hemisferio real) — es una aproximación explícita, se comunica así en la UI.
- Sin build ni tests automatizados; Tailwind se carga por CDN (no recomendado para producción a futuro, pero suficiente para esto).

## 9. Decisiones tomadas y por qué (para no repetir la discusión)

- **No se implementó una API de clima externa**: se eligió deliberadamente la opción simple (latitud sin API) para evitar dependencias externas y complejidad adicional en esta etapa.
- **Se quitó el % de compatibilidad en vez de calcularlo de verdad**: se decidió priorizar simplicidad ("para facilidad") sobre construir un motor de scoring real. El filtrado real (mostrar/ocultar según condiciones) se mantiene intacto.
- **Se hizo fork en vez de pedir acceso**: la cuenta autenticada (`Eliaselnocapo`) no tiene permiso de escritura sobre `Sack450/PlantMach`.
