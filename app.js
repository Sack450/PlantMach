/**
 * Lógica principal interactiva para PlantMatch.
 * Maneja la carga dinámica desde plants.json, filtros del evaluador inteligente,
 * navegación con scroll spy, diagnóstico de supervivencia y búsqueda en tiempo real.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Estado inicial del filtro Pet-Friendly (por defecto activo)
  let petSafeActive = true;

  // Referencias a elementos clave del DOM
  const petToggleBtn = document.getElementById('petToggleBtn');
  const petToggleKnob = document.getElementById('petToggleKnob');
  const petToggleLabel = document.getElementById('petToggleLabel');
  const matchCounter = document.getElementById('matchCounter');
  const calculateBtn = document.getElementById('calculateBtn');
  let plantCards = document.querySelectorAll('.plant-card');
  let activeCategory = null; // 'beginner' | 'air' | null, controlado por los chips rápidos
  let totalPlantsLoaded = 0;

  /**
   * Actualiza los contadores de resultados y el texto del botón principal
   * desglosando las especies 100% compatibles y las adaptables con micro-ajustes.
   * @param {number|object} counts - Número simple o { perfectMatches, adaptableMatches, totalVisible }
   */
  function updateResultCounts(counts) {
    const perfectMatches = typeof counts === 'object' ? (counts.perfectMatches || 0) : (counts || 0);
    const adaptableMatches = typeof counts === 'object' ? (counts.adaptableMatches || 0) : 0;
    const totalVisible = perfectMatches + adaptableMatches;

    if (matchCounter) {
      if (perfectMatches > 0 && adaptableMatches > 0) {
        matchCounter.textContent = `${perfectMatches} compatibles (+${adaptableMatches} adaptables)`;
      } else if (perfectMatches > 0) {
        matchCounter.textContent = `${perfectMatches} especies compatibles`;
      } else if (adaptableMatches > 0) {
        matchCounter.textContent = `${adaptableMatches} adaptables con cuidados`;
      } else {
        matchCounter.textContent = '0 especies';
      }
    }

    if (calculateBtn) {
      if (perfectMatches > 0 && adaptableMatches > 0) {
        calculateBtn.innerHTML = `
          <span class="material-symbols-outlined text-[20px]">auto_awesome</span>
          <span>Ver ${perfectMatches} especies 100% compatibles (+ ${adaptableMatches} con ajustes)</span>
        `;
      } else if (perfectMatches > 0) {
        calculateBtn.innerHTML = `
          <span class="material-symbols-outlined text-[20px]">auto_awesome</span>
          <span>Ver ${perfectMatches} especies 100% compatibles</span>
        `;
      } else if (adaptableMatches > 0) {
        calculateBtn.innerHTML = `
          <span class="material-symbols-outlined text-[20px]">tips_and_updates</span>
          <span>Ver ${adaptableMatches} especies adaptables a tu espacio</span>
        `;
      } else {
        calculateBtn.innerHTML = `
          <span class="material-symbols-outlined text-[20px]">tune</span>
          <span>0 especies compatibles (prueba flexibilizar filtros)</span>
        `;
      }
    }
  }

  // Evita inyección de HTML al insertar texto proveniente del usuario o de la API externa
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ==========================================================
  // ESTADO GLOBAL: FAVORITOS, COMPARADOR Y NOTIFICACIONES
  // ==========================================================
  let favoriteIds = new Set(JSON.parse(localStorage.getItem('plantmatch_favs') || '[]'));
  let selectedCompareIds = new Set();
  let currentDetailPlantId = null;

  /**
   * Muestra una notificación emergente estilizada en la esquina inferior derecha.
   * @param {string} message - Texto informativo
   * @param {string} icon - Nombre del icono de Material Symbols
   */
  function showToast(message, icon = 'check_circle') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto bg-surface-container-lowest border border-outline-variant/40 text-on-surface p-3.5 px-5 rounded-2xl shadow-xl flex items-center gap-2.5 transition-all duration-300 transform translate-y-4 opacity-0 text-body-sm font-medium';
    toast.innerHTML = `
      <span class="material-symbols-outlined text-primary text-[20px] shrink-0">${escapeHtml(icon)}</span>
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  /**
   * Actualiza los contadores numéricos de favoritos en Header y Hero chip.
   */
  function updateFavoriteBadges() {
    const count = favoriteIds.size;
    const badge = document.getElementById('favHeaderBadge');
    const chipCount = document.getElementById('favCountChip');
    if (badge) badge.textContent = count.toString();
    if (chipCount) chipCount.textContent = count.toString();
  }

  /**
   * Sincroniza el aspecto de los botones de favorito en todas las tarjetas visibles y modales.
   */
  function updateFavoriteButtonsUI() {
    document.querySelectorAll('.favorite-toggle-btn').forEach(btn => {
      const id = btn.getAttribute('data-plant-id');
      const icon = btn.querySelector('.favorite-icon');
      if (favoriteIds.has(id)) {
        btn.classList.add('text-primary');
        if (icon) icon.textContent = 'favorite';
      } else {
        btn.classList.remove('text-primary');
        if (icon) icon.textContent = 'favorite_border';
      }
    });

    const modalFavIcon = document.getElementById('modalFavIcon');
    if (modalFavIcon && currentDetailPlantId) {
      modalFavIcon.textContent = favoriteIds.has(currentDetailPlantId) ? 'favorite' : 'favorite_border';
    }
  }

  /**
   * Agrega o elimina una planta de la lista de favoritos en localStorage.
   * @param {string} plantId - ID único de la planta
   */
  function toggleFavorite(plantId) {
    if (favoriteIds.has(plantId)) {
      favoriteIds.delete(plantId);
      showToast('Planta eliminada de favoritos', 'favorite_border');
    } else {
      favoriteIds.add(plantId);
      const plant = plantsById[plantId];
      showToast(`Guardada en favoritos: ${plant ? plant.name : 'Planta'}`, 'favorite');
    }
    localStorage.setItem('plantmatch_favs', JSON.stringify(Array.from(favoriteIds)));
    updateFavoriteBadges();
    updateFavoriteButtonsUI();

    if (activeCategory === 'favorites') {
      updateResultCounts(filterCards());
    }
  }

  // ==========================================================
  // GENERADOR DE CALENDARIO DE RIEGO INTELIGENTE (.ICS)
  // ==========================================================

  /**
   * Descarga un archivo en el navegador del usuario utilizando un Blob virtual.
   * @param {string} filename - Nombre del archivo a guardar
   * @param {string} content - Contenido en texto plano del archivo .ics
   */
  function downloadIcsFile(filename, content) {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Construye un archivo estándar iCalendar (.ics) para sincronizar recordatorios de riego.
   * @param {object} plant - Datos botánicos de la planta
   * @returns {string} Formato estándar RFC 5545
   */
  function generateWateringIcs(plant) {
    let rrule = 'FREQ=WEEKLY;INTERVAL=1';
    let freqText = 'Semanal';

    if (plant.watering === 'rarely') {
      rrule = 'FREQ=MONTHLY;INTERVAL=1';
      freqText = 'Mensual (cada 25-30 días)';
    } else if (plant.watering === 'biweekly') {
      rrule = 'FREQ=WEEKLY;INTERVAL=2';
      freqText = 'Quincenal (cada 14 días)';
    } else if (plant.watering === 'frequent') {
      rrule = 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TH';
      freqText = '2 veces por semana (Lunes y Jueves)';
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const pad = (n) => String(n).padStart(2, '0');
    const formatIcsDate = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

    const dtStamp = formatIcsDate(now) + 'Z';
    const dtStart = formatIcsDate(tomorrow);
    const dtEnd = formatIcsDate(new Date(tomorrow.getTime() + 15 * 60000));

    const summary = `💧 Riego: ${plant.name}`;
    const desc = `Recordatorio de PlantMatch para tu ${plant.name} (${plant.commonName || ''}).\\nFrecuencia sugerida: ${freqText}.\\nRegla de los 2 nudillos: comprueba que los primeros 4 cm de tierra estén secos antes de regar.\\nLuz recomendada: ${plant.highlights ? plant.highlights.lightText : 'Adecuada'}.`;

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PlantMatch//Calendario de Riego Botanico//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:plantmatch-${plant.id || 'plant'}-${Date.now()}@plantmatch.local`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `RRULE:${rrule}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT10M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Hora de regar tu ${plant.name}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }

  /**
   * Dispara la descarga del calendario de riego para una especie específica.
   * @param {string} plantId - ID único de la planta
   */
  function downloadWateringCalendar(plantId) {
    const plant = plantsById[plantId];
    if (!plant) return;
    const icsContent = generateWateringIcs(plant);
    const filename = `Riego-${plant.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    downloadIcsFile(filename, icsContent);
    showToast(`Calendario descargado: ${plant.name}`, 'calendar_month');
  }

  // ==========================================================
  // COMPARADOR CARA A CARA (HASTA 3 ESPECIES)
  // ==========================================================

  /**
   * Selecciona o deselecciona una planta para el comparador.
   * @param {string} plantId - ID único de la planta
   */
  function toggleComparePlant(plantId) {
    if (selectedCompareIds.has(plantId)) {
      selectedCompareIds.delete(plantId);
    } else {
      if (selectedCompareIds.size >= 3) {
        showToast('Máximo 3 plantas simultáneas para comparar', 'info');
        return;
      }
      selectedCompareIds.add(plantId);
      const plant = plantsById[plantId];
      showToast(`Añadida al comparador: ${plant ? plant.name : ''}`, 'balance');
    }
    updateCompareBarUI();
    updateCompareButtonsUI();
  }

  /**
   * Actualiza el estilo visual de los botones de comparar en las tarjetas.
   */
  function updateCompareButtonsUI() {
    document.querySelectorAll('.compare-toggle-btn').forEach(btn => {
      const id = btn.getAttribute('data-plant-id');
      if (selectedCompareIds.has(id)) {
        btn.classList.add('bg-primary/15', 'text-primary');
      } else {
        btn.classList.remove('bg-primary/15', 'text-primary');
      }
    });
  }

  /**
   * Muestra u oculta la barra flotante con las miniaturas de las plantas a comparar.
   */
  function updateCompareBarUI() {
    const compareBar = document.getElementById('compareBar');
    const compareCount = document.getElementById('compareCount');
    const compareThumbnails = document.getElementById('compareThumbnails');
    if (!compareBar || !compareCount || !compareThumbnails) return;

    if (selectedCompareIds.size > 0) {
      compareBar.classList.remove('hidden');
      compareBar.classList.add('flex');
      compareCount.textContent = selectedCompareIds.size.toString();
      compareThumbnails.innerHTML = Array.from(selectedCompareIds).map(id => {
        const p = plantsById[id];
        if (!p) return '';
        return `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="w-8 h-8 rounded-full object-cover border-2 border-primary shadow-sm" title="${escapeHtml(p.name)}"/>`;
      }).join('');
    } else {
      compareBar.classList.add('hidden');
      compareBar.classList.remove('flex');
    }
  }

  /**
   * Construye y renderiza la tabla comparativa cara a cara dentro del modal.
   */
  function renderCompareModal() {
    const modalBody = document.getElementById('compareModalBody');
    if (!modalBody) return;

    const plants = Array.from(selectedCompareIds).map(id => plantsById[id]).filter(Boolean);
    if (plants.length === 0) {
      modalBody.innerHTML = '<p class="text-center py-8 text-on-surface-variant">Selecciona al menos 1 planta con el icono de comparar.</p>';
      return;
    }

    modalBody.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm min-w-[620px]">
          <thead>
            <tr class="border-b border-surface-container-high bg-surface-container-low/50">
              <th class="p-3 text-on-surface-variant font-semibold w-1/4">Característica</th>
              ${plants.map(p => `
                <th class="p-3 text-center w-1/3">
                  <div class="flex flex-col items-center">
                    <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="w-20 h-20 rounded-2xl object-cover mb-2 shadow-sm"/>
                    <span class="font-bold text-on-surface text-[15px] leading-snug">${escapeHtml(p.name)}</span>
                    <span class="text-[12px] italic text-on-surface-variant">${escapeHtml(p.commonName || '')}</span>
                    <button class="modal-remove-compare-btn mt-2 text-[11px] text-error hover:underline flex items-center gap-0.5 cursor-pointer" data-id="${escapeHtml(p.id)}">
                      <span class="material-symbols-outlined text-[14px]">close</span> Quitar
                    </button>
                  </div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-container-high">
            <tr>
              <td class="p-3 font-semibold text-on-surface-variant flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[18px] text-tertiary">pets</span> Seguridad Mascotas
              </td>
              ${plants.map(p => `
                <td class="p-3 text-center">
                  <span class="px-2.5 py-1 rounded-full text-[12px] font-semibold ${p.petSafe ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-primary-fixed text-on-primary-fixed'}">
                    ${p.petSafe ? '100% Pet-Friendly' : '⚠️ Precaución'}
                  </span>
                </td>
              `).join('')}
            </tr>
            <tr>
              <td class="p-3 font-semibold text-on-surface-variant flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[18px] text-primary">wb_sunny</span> Iluminación
              </td>
              ${plants.map(p => `
                <td class="p-3 text-center font-medium text-on-surface">
                  ${escapeHtml(p.highlights ? p.highlights.lightText : p.light)}
                </td>
              `).join('')}
            </tr>
            <tr>
              <td class="p-3 font-semibold text-on-surface-variant flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[18px] text-tertiary">humidity_percentage</span> Humedad Ideal
              </td>
              ${plants.map(p => `
                <td class="p-3 text-center font-medium text-on-surface">
                  ${Array.isArray(p.humidity) ? p.humidity.join(' y ') : (p.humidity || 'Media')}
                </td>
              `).join('')}
            </tr>
            <tr>
              <td class="p-3 font-semibold text-on-surface-variant flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[18px] text-secondary">water_drop</span> Frecuencia de Riego
              </td>
              ${plants.map(p => `
                <td class="p-3 text-center font-medium text-on-surface">
                  ${escapeHtml(p.highlights ? p.highlights.waterText : p.watering)}
                </td>
              `).join('')}
            </tr>
            <tr>
              <td class="p-3 font-semibold text-on-surface-variant flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[18px]">verified</span> Dificultad
              </td>
              ${plants.map(p => `
                <td class="p-3 text-center">
                  <span class="px-2.5 py-0.5 rounded-full text-[12px] bg-secondary-container text-on-secondary-container font-medium">
                    ${escapeHtml(p.difficulty)}
                  </span>
                </td>
              `).join('')}
            </tr>
            <tr>
              <td class="p-3 font-semibold text-on-surface-variant flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[18px] text-secondary">calendar_month</span> Recordatorio
              </td>
              ${plants.map(p => `
                <td class="p-3 text-center">
                  <button class="compare-download-ics-btn inline-flex items-center gap-1 bg-secondary text-on-secondary hover:bg-secondary/90 text-[12px] font-semibold px-3 py-1.5 rounded-full shadow-sm cursor-pointer transition-all" data-id="${escapeHtml(p.id)}">
                    <span class="material-symbols-outlined text-[14px]">download</span> Descargar .ics
                  </button>
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;

    modalBody.querySelectorAll('.modal-remove-compare-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleComparePlant(btn.getAttribute('data-id'));
        renderCompareModal();
      });
    });

    modalBody.querySelectorAll('.compare-download-ics-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        downloadWateringCalendar(btn.getAttribute('data-id'));
      });
    });
  }

  // ==========================================
  // 1. CARGA DINÁMICA DE PLANTAS (plants.json)
  // ==========================================
  // Carga Híbrida: JSON Local + API Externa
async function loadPlants() {
  try {
    // 1. Cargar tus plantas estrella locales
    const localResponse = await fetch('./plants.json');
    const localPlants = await localResponse.json();

    // 2. Consultar la API externa (Paso 2)
    const externalPlants = await fetchExternalPlants();

    // 3. Fusionar ambos catálogos (Local + Externo)
    const allPlants = [...localPlants, ...externalPlants];

    // 4. Mandar a renderizar todo junto
    renderPlantGrid(allPlants);

  } catch (error) {
    console.error("Error en la carga híbrida:", error);
    // Si falló algo (probablemente plants.json), avisamos en pantalla en vez de dejarla en blanco
    const container = document.getElementById('plantGrid');
    if (container) {
      container.innerHTML = `
        <p class="col-span-full text-center text-on-surface-variant font-body-md text-body-md py-space-xl">
          No pudimos cargar el catálogo de plantas. Comprueba tu conexión y recarga la página.
        </p>`;
    }
  }
}

async function fetchExternalPlants() {
  const API_KEY = ''; // Deja tu clave real aquí si quieres sumar el catálogo externo de Perenual
  if (!API_KEY) return []; // Sin clave no hay nada que consultar: evita una petición fallida en cada carga

  const url = `https://perenual.com/api/species-list?key=${API_KEY}&indoor=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !Array.isArray(data.data)) return [];

    const adaptedPlants = data.data
      // Filtramos para que solo pasen las plantas que sí traen foto
      .filter(item => item.default_image && item.default_image.regular_url) 
      .map(apiPlant => {
        
        // 1. Validación segura para la luz (sunlight)
        let lightValue = "bright-indirect";
        // Solo evaluamos si apiPlant.sunlight NO es null
        if (apiPlant.sunlight) { 
          const sunText = String(apiPlant.sunlight).toLowerCase();
          if (sunText.includes("shade")) lightValue = "low-light";
          if (sunText.includes("sun")) lightValue = "direct-sun";
        }

        // 2. Validación segura para el riego (watering)
        let wateringValue = "weekly";
        if (apiPlant.watering) {
          const waterText = String(apiPlant.watering).toLowerCase();
          if (waterText.includes("frequent")) wateringValue = "frequent";
          if (waterText.includes("minimum")) wateringValue = "rarely";
        }

        // 3. Extracción segura del texto a mostrar en la tarjeta
        const displayLight = Array.isArray(apiPlant.sunlight) ? apiPlant.sunlight[0] : (apiPlant.sunlight || "Adaptable");

        return {
          id: `api-${apiPlant.id}`,
          name: apiPlant.scientific_name ? apiPlant.scientific_name[0] : "Especie Botánica",
          commonName: apiPlant.common_name || "Planta de interior",
          difficulty: "Media",
          type: "interior",
          climates: ["oceanic", "mediterranean", "continental", "tropical"],
          light: lightValue,
          humidity: "medium",
          watering: wateringValue,
          petSafe: true,
          image: apiPlant.default_image.regular_url,
          highlights: {
            lightText: displayLight,
            waterText: apiPlant.watering || "Regular",
            airText: "Catálogo Global"
          },
          footerNote: ""
        };
      });

    return adaptedPlants;

  } catch (error) {
    
    console.error("Detalle exacto del error con la API:", error);
    return [];
  }
}

  function renderPlantGrid(plants) {
    const container = document.getElementById('plantGrid');
    if (!container) return;

    container.innerHTML = plants.map(plant => {
      const isAirPurifier = /purific/i.test((plant.highlights && plant.highlights.airText) || '');
      return `
      <div class="plant-card bg-surface-container-lowest rounded-lg overflow-hidden shadow-[0_4px_20px_-2px_rgba(27,67,50,0.05)] transition-all duration-300 hover:shadow-[0_12px_32px_-4px_rgba(27,67,50,0.12)] hover:-translate-y-1 flex flex-col"
           data-diff="${escapeHtml(plant.difficulty)}"
           data-light="${escapeHtml(plant.light)}"
           data-humidity="${escapeHtml(Array.isArray(plant.humidity) ? plant.humidity.join(' ') : (plant.humidity || 'medium'))}"
           data-watering="${escapeHtml(plant.watering || 'weekly')}"
           data-pet="${plant.petSafe ? 'friendly' : 'caution'}"
           data-tags="${isAirPurifier ? 'air' : ''}"
           data-type="${escapeHtml(plant.type || 'interior')}"
           data-climates="${escapeHtml((plant.climates || ['oceanic', 'mediterranean', 'continental', 'tropical']).join(' '))}">

        <div class="relative h-64 w-full overflow-hidden bg-surface-container">
          <img class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" src="${escapeHtml(plant.image)}" alt="${escapeHtml(plant.name)}"/>

          <!-- Badge de Compatibilidad Algorítmica (100% o Adaptable) -->
          <div class="match-badge absolute top-4 left-4 font-label-sm text-label-sm px-space-sm py-space-2xs rounded-full flex items-center gap-1 shadow-md font-semibold transition-all bg-tertiary text-on-tertiary">
            <span class="material-symbols-outlined text-[14px] match-badge-icon">verified</span>
            <span class="match-badge-text">100% Compatible</span>
          </div>

          <!-- Pet Warning Badge -->
          <div class="absolute top-4 right-4 ${plant.petSafe ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container-lowest/90 text-primary'} font-label-sm text-label-sm px-space-sm py-space-2xs rounded-full flex items-center gap-1 shadow-sm">
            <span class="material-symbols-outlined text-[14px]">pets</span>
            <span>${plant.petSafe ? '100% Pet Friendly' : 'Precaución'}</span>
          </div>
        </div>

        <div class="p-space-lg flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-space-2xs">
              <h3 class="font-headline-sm text-headline-sm text-on-surface">${escapeHtml(plant.name)}</h3>
              <span class="font-label-sm text-label-sm px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container">${escapeHtml(plant.difficulty)}</span>
            </div>
            <p class="font-body-sm text-body-sm text-on-surface-variant italic mb-space-md">${escapeHtml(plant.commonName)}</p>

            <div class="grid grid-cols-3 gap-space-xs p-space-sm rounded-xl bg-surface-container-low mb-space-sm text-center">
              <div class="flex flex-col items-center">
                <span class="material-symbols-outlined text-primary text-[18px] mb-0.5">wb_sunny</span>
                <span class="font-label-sm text-label-sm text-on-surface font-semibold">${escapeHtml(plant.highlights ? plant.highlights.lightText : 'Adaptable')}</span>
              </div>
              <div class="flex flex-col items-center">
                <span class="material-symbols-outlined text-secondary text-[18px] mb-0.5">water_drop</span>
                <span class="font-label-sm text-label-sm text-on-surface font-semibold">${escapeHtml(plant.highlights ? plant.highlights.waterText : 'Regular')}</span>
              </div>
              <div class="flex flex-col items-center">
                <span class="material-symbols-outlined text-tertiary text-[18px] mb-0.5">air</span>
                <span class="font-label-sm text-label-sm text-on-surface font-semibold">${escapeHtml(plant.highlights ? plant.highlights.airText : 'Purificadora')}</span>
              </div>
            </div>

            <!-- Caja de consejo botánico para compatibilidad parcial (se muestra si es adaptable) -->
            <div class="adaptation-tip-box p-2.5 rounded-xl bg-secondary-container/40 border border-secondary/25 text-body-sm text-on-surface flex items-start gap-2 mb-space-sm hidden">
              <span class="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">tips_and_updates</span>
              <p class="adaptation-tip-text text-[12px] leading-snug text-on-surface"></p>
            </div>
          </div>

          <div class="flex items-center justify-between pt-space-xs border-t border-surface-container-high/60 mt-space-xs">
            <div class="flex items-center gap-1">
              <button class="favorite-toggle-btn p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer" type="button" data-plant-id="${escapeHtml(plant.id)}" title="Guardar en favoritos">
                <span class="material-symbols-outlined text-[20px] favorite-icon">${favoriteIds.has(plant.id) ? 'favorite' : 'favorite_border'}</span>
              </button>
              <button class="compare-toggle-btn p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer" type="button" data-plant-id="${escapeHtml(plant.id)}" title="Añadir al comparador">
                <span class="material-symbols-outlined text-[18px]">balance</span>
              </button>
            </div>
            <button class="view-details-btn inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:text-primary-container transition-colors cursor-pointer" type="button" data-plant-id="${escapeHtml(plant.id)}">
              <span>Ver ficha</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    `;
    }).join('');

    // Actualiza la lista de nodos guardados en memoria
    plantCards = document.querySelectorAll('.plant-card');
    totalPlantsLoaded = plants.length;
    updateResultCounts(filterCards());

    // Guarda los datos completos para poder mostrarlos en la ficha ("Ver ficha")
    plantsById = {};
    plants.forEach(p => { plantsById[p.id] = p; });

    // Conectar los clics de favorito en cada tarjeta
    document.querySelectorAll('.favorite-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(btn.getAttribute('data-plant-id'));
      });
    });

    // Conectar los clics de comparar en cada tarjeta
    document.querySelectorAll('.compare-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleComparePlant(btn.getAttribute('data-plant-id'));
      });
    });

    // Sincronizar el estado visual de favoritos (restaurar los que ya estaban guardados)
    updateFavoriteBadges();
    updateFavoriteButtonsUI();
  }

  // ==========================================
  // 1.1 FICHA DE PLANTA (modal "Ver ficha")
  // ==========================================
  let plantsById = {};
  const LIGHT_LABELS = {
    'bright-indirect': 'Luz indirecta brillante',
    'direct-sun': 'Sol directo intenso',
    'low-light': 'Poca luz / indirecta suave',
    'artificial': 'Luz artificial de oficina'
  };
  const HUMIDITY_LABELS = { 'low': 'Humedad baja (<35%)', 'medium': 'Humedad media (40-60%)', 'high': 'Humedad alta (>65%)' };
  const WATERING_LABELS = {
    'weekly': 'Riego semanal',
    'biweekly': 'Riego quincenal',
    'rarely': 'Riego muy espaciado (mensual)',
    'frequent': 'Riego frecuente (2-3x/semana)'
  };
  const CLIMATE_LABELS = {
    'oceanic': 'Templado oceánico',
    'mediterranean': 'Mediterráneo',
    'continental': 'Continental frío',
    'tropical': 'Tropical húmedo'
  };

  const plantDetailModal = document.getElementById('plantDetailModal');
  const plantDetailCloseBtn = document.getElementById('plantDetailCloseBtn');

  function openPlantDetail(plantId) {
    const plant = plantsById[plantId];
    if (!plant || !plantDetailModal) return;

    document.getElementById('plantDetailImage').src = plant.image;
    document.getElementById('plantDetailImage').alt = plant.name;
    document.getElementById('plantDetailName').textContent = plant.name;
    document.getElementById('plantDetailCommonName').textContent = plant.commonName || '';
    document.getElementById('plantDetailDifficulty').textContent = plant.difficulty || '';
    document.getElementById('plantDetailType').textContent = plant.type === 'exterior' ? 'Exterior (jardín)' : 'Interior (maceta)';

    const petEl = document.getElementById('plantDetailPet');
    petEl.textContent = plant.petSafe ? '100% Pet Friendly' : 'Precaución con mascotas';
    petEl.className = 'font-label-sm text-label-sm px-space-sm py-0.5 rounded-full ' +
      (plant.petSafe ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container text-on-surface');

    document.getElementById('plantDetailLight').textContent = LIGHT_LABELS[plant.light] || plant.light || '—';
    document.getElementById('plantDetailWatering').textContent = WATERING_LABELS[plant.watering] || plant.watering || '—';
    document.getElementById('plantDetailHumidity').textContent = HUMIDITY_LABELS[plant.humidity] || plant.humidity || '—';

    const climates = (plant.climates || []).map(c => CLIMATE_LABELS[c] || c);
    document.getElementById('plantDetailClimates').textContent = climates.length ? climates.join(', ') : 'Sin datos de clima específicos.';

    document.getElementById('plantDetailFooterNote').textContent = plant.footerNote || '';

    // Guardar el ID de la planta actualmente abierta para el modal de favoritos y descarga .ics
    currentDetailPlantId = plantId;

    // Sincronizar el icono de favorito del modal con el estado actual
    const modalFavIcon = document.getElementById('modalFavIcon');
    if (modalFavIcon) {
      modalFavIcon.textContent = favoriteIds.has(plantId) ? 'favorite' : 'favorite_border';
    }

    plantDetailModal.classList.remove('hidden');
    plantDetailModal.classList.add('flex');
  }

  function closePlantDetail() {
    if (!plantDetailModal) return;
    plantDetailModal.classList.add('hidden');
    plantDetailModal.classList.remove('flex');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-details-btn');
    if (btn) openPlantDetail(btn.getAttribute('data-plant-id'));
  });
  if (plantDetailCloseBtn) plantDetailCloseBtn.addEventListener('click', closePlantDetail);
  if (plantDetailModal) {
    plantDetailModal.addEventListener('click', (e) => {
      if (e.target === plantDetailModal) closePlantDetail();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePlantDetail();
      // También cerrar el modal del comparador si está abierto
      const compareModal = document.getElementById('compareModal');
      if (compareModal && !compareModal.classList.contains('hidden')) {
        compareModal.classList.add('hidden');
        compareModal.classList.remove('flex');
      }
    }
  });

  // ==========================================================
  // EVENT LISTENERS: MODAL .ICS (FASE 2)
  // ==========================================================
  const modalDownloadIcsBtn = document.getElementById('modalDownloadIcsBtn');
  if (modalDownloadIcsBtn) {
    modalDownloadIcsBtn.addEventListener('click', () => {
      if (currentDetailPlantId) {
        downloadWateringCalendar(currentDetailPlantId);
      }
    });
  }

  // ==========================================================
  // EVENT LISTENERS: FAVORITO EN MODAL (FASE 4)
  // ==========================================================
  const modalToggleFavBtn = document.getElementById('modalToggleFavBtn');
  if (modalToggleFavBtn) {
    modalToggleFavBtn.addEventListener('click', () => {
      if (currentDetailPlantId) {
        toggleFavorite(currentDetailPlantId);
        // Actualizar icono del modal después del toggle
        const modalFavIcon = document.getElementById('modalFavIcon');
        if (modalFavIcon) {
          modalFavIcon.textContent = favoriteIds.has(currentDetailPlantId) ? 'favorite' : 'favorite_border';
        }
      }
    });
  }

  // ==========================================================
  // EVENT LISTENERS: COMPARADOR CARA A CARA (FASE 3)
  // ==========================================================
  const openCompareModalBtn = document.getElementById('openCompareModalBtn');
  const clearCompareBtn = document.getElementById('clearCompareBtn');
  const closeCompareModalBtn = document.getElementById('closeCompareModalBtn');
  const compareModal = document.getElementById('compareModal');

  if (openCompareModalBtn) {
    openCompareModalBtn.addEventListener('click', () => {
      if (selectedCompareIds.size === 0) {
        showToast('Selecciona al menos 1 planta para comparar', 'info');
        return;
      }
      renderCompareModal();
      if (compareModal) {
        compareModal.classList.remove('hidden');
        compareModal.classList.add('flex');
      }
    });
  }

  if (clearCompareBtn) {
    clearCompareBtn.addEventListener('click', () => {
      selectedCompareIds.clear();
      updateCompareBarUI();
      updateCompareButtonsUI();
      showToast('Selección del comparador limpiada', 'delete');
    });
  }

  if (closeCompareModalBtn && compareModal) {
    closeCompareModalBtn.addEventListener('click', () => {
      compareModal.classList.add('hidden');
      compareModal.classList.remove('flex');
    });
    // Cerrar al hacer clic en el fondo oscuro del modal
    compareModal.addEventListener('click', (e) => {
      if (e.target === compareModal) {
        compareModal.classList.add('hidden');
        compareModal.classList.remove('flex');
      }
    });
  }

  // ==========================================================
  // EVENT LISTENERS: BOTÓN FAVORITOS EN HEADER (FASE 4)
  // ==========================================================
  const openFavoritesBtn = document.getElementById('openFavoritesBtn');
  if (openFavoritesBtn) {
    openFavoritesBtn.addEventListener('click', () => {
      // Activar el chip rápido de favoritos y desplazar al catálogo
      activeCategory = activeCategory === 'favorites' ? null : 'favorites';
      updateResultCounts(filterCards());

      const evalSection = document.getElementById('catalogo-de-plantas');
      if (evalSection) {
        evalSection.scrollIntoView({ behavior: 'smooth' });
      }

      if (activeCategory === 'favorites') {
        showToast(`Mostrando ${favoriteIds.size} planta(s) favorita(s)`, 'favorite');
      } else {
        showToast('Mostrando todas las plantas', 'grid_view');
      }
    });
  }

  // ==========================================
  // 2. FILTRADO Y EVALUADOR INTELIGENTE
  // ==========================================
  function updatePetState() {
    if (petToggleBtn && petToggleKnob && petToggleLabel) {
      if (petSafeActive) {
        petToggleBtn.classList.remove('bg-surface-dim');
        petToggleBtn.classList.add('bg-tertiary');
        petToggleKnob.classList.add('translate-x-6');
        petToggleKnob.classList.remove('translate-x-0.5');
        petToggleLabel.textContent = 'Solo 100% No Tóxicas';
      } else {
        petToggleBtn.classList.add('bg-surface-dim');
        petToggleBtn.classList.remove('bg-tertiary');
        petToggleKnob.classList.remove('translate-x-6');
        petToggleKnob.classList.add('translate-x-0.5');
        petToggleLabel.textContent = 'Todas las especies (con y sin mascotas)';
      }
    }
    updateResultCounts(filterCards());
  }

  /**
   * Genera un consejo botánico de adaptación cuando una especie difiere en un único parámetro ambiental.
   * @param {string} failedFactor - Factor que no coincide ('humidity' | 'light' | 'watering' | 'climate')
   * @param {object} context - Valores seleccionados por el usuario y características de la planta
   * @returns {string} Consejo botánico en español con pauta práctica
   */
  function getAdaptationTip(failedFactor, context) {
    const { selectedHumidity, selectedLight, selectedWatering } = context;

    switch (failedFactor) {
      case 'humidity':
        if (selectedHumidity === 'low') {
          return 'Pulveriza sus hojas con agua tibia 2 veces por semana o colócala sobre un plato con piedras húmedas para compensar el ambiente seco.';
        }
        if (selectedHumidity === 'high') {
          return 'Tolera humedad alta siempre que cuente con sustrato drenante y una habitación con buena ventilación.';
        }
        return 'Se adapta con facilidad a humedad media manteniendo su sustrato ligeramente fresco sin encharcar.';

      case 'light':
        if (selectedLight === 'low-light') {
          return 'Para compensar la luz tenue de tu espacio, sitúala lo más cerca posible de la ventana o apóyala con luz auxiliar.';
        }
        if (selectedLight === 'direct-sun') {
          return 'Filtra el sol directo en las horas centrales del día mediante una cortina ligera o visillo para evitar quemar sus hojas.';
        }
        return 'Ubícala en el punto más luminoso de la estancia para favorecer su vigor foliar.';

      case 'watering':
        if (selectedWatering === 'rarely') {
          return 'La planta prefiere un riego algo más regular; puedes usar una maceta con autorriego o programar un recordatorio quincenal.';
        }
        return 'Aplica la regla de los 2 nudillos: comprueba que los primeros 4 cm de tierra estén secos antes de regar para proteger sus raíces.';

      case 'climate':
        return 'Al cultivarse en interiores resguardados de corrientes frías y heladas, prosperará normalmente a temperatura ambiente.';

      default:
        return 'Requiere pequeños ajustes en la rutina de cuidados para adaptarse con éxito a tu espacio.';
    }
  }

  // Luz, humedad, riego, clima, ubicación (interior/exterior) y mascotas filtran el catálogo
  // con clasificación dual: 100% Compatibles (Match perfecto) y 85% Adaptables (con micro-ajustes).
  function filterCards() {
    let perfectMatches = 0;
    let adaptableMatches = 0;

    const lightSelect = document.getElementById('lightSelect');
    const humiditySelect = document.getElementById('humiditySelect');
    const wateringSelect = document.getElementById('wateringSelect');
    const climateSelect = document.getElementById('climateSelect');
    const placementSelect = document.getElementById('placementSelect');

    const selectedLight = lightSelect ? lightSelect.value : null;
    const selectedHumidity = humiditySelect ? humiditySelect.value : null;
    const selectedWatering = wateringSelect ? wateringSelect.value : null;
    const selectedClimate = climateSelect ? climateSelect.value : null;
    const selectedPlacement = placementSelect ? placementSelect.value : null;

    plantCards.forEach(card => {
      const isPetSafe = card.getAttribute('data-pet') === 'friendly';
      const plantLight = card.getAttribute('data-light');
      const plantHumidities = (card.getAttribute('data-humidity') || '').split(' ');
      const plantWatering = card.getAttribute('data-watering');
      const plantDiff = card.getAttribute('data-diff') || '';
      const plantTags = card.getAttribute('data-tags') || '';
      const plantType = card.getAttribute('data-type') || 'interior';
      const plantClimates = (card.getAttribute('data-climates') || '').split(' ');

      const matchBadge = card.querySelector('.match-badge');
      const matchBadgeText = card.querySelector('.match-badge-text');
      const matchBadgeIcon = card.querySelector('.match-badge-icon');
      const tipBox = card.querySelector('.adaptation-tip-box');
      const tipText = card.querySelector('.adaptation-tip-text');

      // 1. REGLAS ESTRICTAS DE SEGURIDAD Y ENTORNO (Descalificación directa)
      const passesPet = !petSafeActive || isPetSafe;
      const passesPlacement = !selectedPlacement || plantType === selectedPlacement;
      const passesCategory = !activeCategory
        || (activeCategory === 'beginner' && ['Principiante', 'Muy fácil', 'Fácil'].includes(plantDiff))
        || (activeCategory === 'air' && plantTags.includes('air'));

      if (!passesPet || !passesPlacement || !passesCategory) {
        card.style.display = 'none';
        return;
      }

      // 2. EVALUACIÓN DE LOS 4 FACTORES AMBIENTALES
      const failedFactors = [];
      if (selectedClimate && !plantClimates.includes(selectedClimate)) failedFactors.push('climate');
      if (selectedLight && plantLight && plantLight !== selectedLight) failedFactors.push('light');
      if (selectedHumidity && !plantHumidities.includes(selectedHumidity)) failedFactors.push('humidity');
      if (selectedWatering && plantWatering && plantWatering !== selectedWatering) failedFactors.push('watering');

      if (failedFactors.length === 0) {
        // MATCH PERFECTO (100%) - Aparece al inicio de la grilla
        card.style.display = 'flex';
        card.style.order = '1';

        if (matchBadge) {
          matchBadge.className = 'match-badge absolute top-4 left-4 font-label-sm text-label-sm px-space-sm py-space-2xs rounded-full flex items-center gap-1 shadow-md font-semibold transition-all bg-tertiary text-on-tertiary';
          if (matchBadgeText) matchBadgeText.textContent = '100% Compatible';
          if (matchBadgeIcon) matchBadgeIcon.textContent = 'verified';
        }
        if (tipBox) {
          tipBox.classList.add('hidden');
        }

        perfectMatches++;
      } else if (failedFactors.length === 1) {
        // MATCH PARCIAL ADAPTABLE (85%) - Aparece después de los perfectos con consejo botánico
        card.style.display = 'flex';
        card.style.order = '2';

        const factor = failedFactors[0];
        const tipMessage = getAdaptationTip(factor, {
          selectedHumidity,
          selectedLight,
          selectedWatering,
          selectedClimate,
          plantHumidities,
          plantLight,
          plantWatering
        });

        if (matchBadge) {
          matchBadge.className = 'match-badge absolute top-4 left-4 font-label-sm text-label-sm px-space-sm py-space-2xs rounded-full flex items-center gap-1 shadow-md font-semibold transition-all bg-secondary-container text-on-secondary-container border border-secondary/30';
          if (matchBadgeText) matchBadgeText.textContent = '85% Adaptable';
          if (matchBadgeIcon) matchBadgeIcon.textContent = 'tips_and_updates';
        }

        if (tipBox && tipText) {
          tipText.innerHTML = `<strong>Ajuste recomendado:</strong> ${tipMessage}`;
          tipBox.classList.remove('hidden');
        }

        adaptableMatches++;
      } else {
        // Demasiadas discrepancias acumuladas
        card.style.display = 'none';
      }
    });

    const totalVisible = perfectMatches + adaptableMatches;

    // Mensaje explicativo cuando no hay ninguna planta (ni perfecta ni adaptable)
    const grid = document.getElementById('plantGrid');
    if (grid) {
      let noResultsMsg = document.getElementById('noResultsMessage');
      if (!noResultsMsg) {
        noResultsMsg = document.createElement('div');
        noResultsMsg.id = 'noResultsMessage';
        noResultsMsg.className = 'col-span-full text-center text-on-surface-variant font-body-md text-body-md py-space-2xl bg-surface-container-low rounded-2xl p-space-xl border border-outline-variant/30';
        grid.appendChild(noResultsMsg);
      }
      if (totalVisible === 0) {
        noResultsMsg.innerHTML = `
          <div class="max-w-md mx-auto flex flex-col items-center">
            <span class="material-symbols-outlined text-[40px] text-primary mb-2">filter_alt_off</span>
            <p class="font-headline-sm text-headline-sm text-on-surface mb-1">Sin coincidencias exactas</p>
            <p class="text-on-surface-variant text-body-sm">Prueba desactivando la seguridad de mascotas o seleccionando "Cualquiera" en humedad o luz para explorar más opciones.</p>
          </div>
        `;
        noResultsMsg.classList.remove('hidden');
      } else {
        noResultsMsg.classList.add('hidden');
      }
    }

    return { perfectMatches, adaptableMatches, totalVisible };
  }

  // Recalcula en vivo al tocar cualquier selector del evaluador, tal como promete el texto de la sección
  ['lightSelect', 'humiditySelect', 'wateringSelect', 'climateSelect', 'placementSelect'].forEach(id => {
    const select = document.getElementById(id);
    if (select) select.addEventListener('change', () => updateResultCounts(filterCards()));
  });

  if (petToggleBtn) {
    petToggleBtn.addEventListener('click', () => {
      petSafeActive = !petSafeActive;
      updatePetState();
    });
  }

  // ==========================================================
  // GEOLOCALIZACIÓN Y METEOROLOGÍA EN VIVO (Open-Meteo + Latitud)
  // ==========================================================
  
  /**
   * Consulta datos meteorológicos en tiempo real desde la API libre de Open-Meteo
   * utilizando las coordenadas geográficas del usuario.
   * Usamos AbortController para evitar congelamientos si la red del usuario es lenta.
   * @param {number} latitude - Latitud en grados decimales
   * @param {number} longitude - Longitud en grados decimales
   * @returns {Promise<object|null>} Datos de temperatura y humedad actual, o null si falla
   */
  async function fetchLiveWeatherData(latitude, longitude) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 4000); // 4 segundos de tiempo límite

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m`;
      const response = await fetch(url, { signal: abortController.signal });
      clearTimeout(timeoutId);

      if (!response.ok) return null;
      const data = await response.json();
      return data.current || null;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('No se pudo contactar a Open-Meteo, se aplicará estimación latitudinal:', err);
      return null;
    }
  }

  /**
   * Mapea un porcentaje de humedad relativa al valor y etiqueta del selector HTML.
   * @param {number} humidityPercent - Humedad relativa en porcentaje (0-100)
   * @returns {{ value: string, label: string }}
   */
  function mapRelativeHumidityToSelect(humidityPercent) {
    if (humidityPercent > 65) {
      return { value: 'high', label: 'Alta (>65%)' };
    }
    if (humidityPercent < 40) {
      return { value: 'low', label: 'Baja (<35%)' };
    }
    return { value: 'medium', label: 'Media estándar (40% - 60%)' };
  }

  /**
   * Estimación macroclimática y de humedad de respaldo por latitud.
   * Se usa si no hay conexión a internet o para definir la zona fitogeográfica base.
   * @param {number} lat - Latitud decimal
   * @returns {{ value: string, label: string, fallbackHumidity: { value: string, label: string } }}
   */
  function estimateClimateFromLatitude(lat) {
    const absLat = Math.abs(lat);
    if (absLat < 23.5) {
      return {
        value: 'tropical',
        label: 'Tropical húmedo (22-34°C)',
        fallbackHumidity: { value: 'high', label: 'Alta (>65%)' }
      };
    }
    if (absLat < 45) {
      return {
        value: 'mediterranean',
        label: 'Mediterráneo seco (18-30°C)',
        fallbackHumidity: { value: 'low', label: 'Baja (<35%)' }
      };
    }
    if (absLat < 58) {
      return {
        value: 'oceanic',
        label: 'Templado oceánico (14-22°C)',
        fallbackHumidity: { value: 'medium', label: 'Media (40-60%)' }
      };
    }
    return {
      value: 'continental',
      label: 'Continental frío (8-26°C)',
      fallbackHumidity: { value: 'low', label: 'Baja (<35%)' }
    };
  }

  const detectLocationBtn = document.getElementById('detectLocationBtn');
  const locationStatus = document.getElementById('locationStatus');
  const climateSelectEl = document.getElementById('climateSelect');
  const humiditySelectEl = document.getElementById('humiditySelect');

  if (detectLocationBtn && locationStatus && climateSelectEl) {
    detectLocationBtn.addEventListener('click', () => {
      // Verificamos compatibilidad de geolocalización en el navegador
      if (!navigator.geolocation) {
        locationStatus.innerHTML = '<span class="text-error font-medium">⚠️ Tu navegador no soporta geolocalización. Selecciona clima y humedad manualmente.</span>';
        locationStatus.classList.remove('hidden');
        return;
      }

      // Estado de espera con spinner mientras el usuario responde a la alerta del navegador
      detectLocationBtn.disabled = true;
      detectLocationBtn.classList.add('opacity-70', 'cursor-wait');
      detectLocationBtn.innerHTML = `
        <span class="material-symbols-outlined text-[18px] animate-spin text-tertiary">progress_activity</span>
        <span>Consultando coordenadas y meteorología en vivo...</span>
      `;
      locationStatus.innerHTML = '<span class="text-on-surface-variant flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px] animate-spin text-tertiary">sync</span> Obteniendo ubicación y consultando estación meteorológica...</span>';
      locationStatus.classList.remove('hidden');

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const climateEstimate = estimateClimateFromLatitude(latitude);

          // Obtenemos los datos meteorológicos en tiempo real de Open-Meteo
          const liveWeatherData = await fetchLiveWeatherData(latitude, longitude);

          let humidityOption;
          let humidityDescription = '';

          if (liveWeatherData && typeof liveWeatherData.relative_humidity_2m === 'number') {
            const currentHumidity = Math.round(liveWeatherData.relative_humidity_2m);
            const currentTemp = Math.round(liveWeatherData.temperature_2m);
            humidityOption = mapRelativeHumidityToSelect(currentHumidity);
            humidityDescription = `Humedad real exterior: <strong>${currentHumidity}%</strong> (${humidityOption.label}) · Temp: <strong>${currentTemp}°C</strong>`;
          } else {
            // Si la API no responde, recurrimos al respaldo bioclimático por latitud
            humidityOption = climateEstimate.fallbackHumidity;
            humidityDescription = `Humedad estimada: <strong>${humidityOption.label}</strong> (modo sin conexión)`;
          }

          // Ajustamos automáticamente ambos selectores geográficos en el formulario
          climateSelectEl.value = climateEstimate.value;
          if (humiditySelectEl) {
            humiditySelectEl.value = humidityOption.value;
          }

          // Resalte visual temporal para que el usuario aprecie qué campos cambiaron
          [climateSelectEl, humiditySelectEl].forEach(element => {
            if (element) {
              element.classList.add('ring-2', 'ring-secondary');
              setTimeout(() => element.classList.remove('ring-2', 'ring-secondary'), 1600);
            }
          });

          // Mostramos la tarjeta informativa con el resumen de la detección
          locationStatus.innerHTML = `
            <div class="flex items-start gap-2 text-on-surface">
              <span class="material-symbols-outlined text-tertiary text-[20px] mt-0.5">check_circle</span>
              <div class="space-y-1 text-body-sm w-full">
                <p class="font-semibold text-tertiary">Parámetros ambientales sincronizados con tu zona:</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1 bg-surface-container-high/60 p-2 rounded-md text-[13px]">
                  <p>🌤️ <strong>Clima:</strong> ${climateEstimate.label}</p>
                  <p>💧 <strong>Humedad:</strong> ${humidityDescription}</p>
                </div>
                <p class="text-on-surface-variant text-[11px] pt-1">✅ <strong>Paso 1 (Clima)</strong> y <strong>Paso 3 (Humedad)</strong> configurados automáticamente. Elige tu ventana, riego y mascotas.</p>
              </div>
            </div>
          `;

          // Restauramos el botón a su estado activo
          detectLocationBtn.disabled = false;
          detectLocationBtn.classList.remove('opacity-70', 'cursor-wait');
          detectLocationBtn.innerHTML = `
            <span class="material-symbols-outlined text-[18px] text-tertiary">my_location</span>
            <span>Clima y humedad actualizados (Volver a detectar)</span>
          `;

          // Recalculamos inmediatamente el catálogo de plantas compatibles
          updateResultCounts(filterCards());
        },
        (error) => {
          let errorMsg = 'No pudimos acceder a tu ubicación. Comprueba que tengas la ubicación activada en tu navegador o en Windows.';
          if (error.code === 1) {
            errorMsg = 'Permiso de ubicación denegado por el navegador. Ajusta el clima y humedad manualmente.';
          } else if (error.code === 3) {
            errorMsg = 'Tiempo de espera agotado al consultar la ubicación. Intenta nuevamente.';
          }

          locationStatus.innerHTML = `
            <div class="flex items-start gap-2 text-on-surface-variant">
              <span class="material-symbols-outlined text-outline text-[18px] mt-0.5">info</span>
              <div>
                <p class="font-medium text-on-surface">${errorMsg}</p>
              </div>
            </div>
          `;

          detectLocationBtn.disabled = false;
          detectLocationBtn.classList.remove('opacity-70', 'cursor-wait');
          detectLocationBtn.innerHTML = `
            <span class="material-symbols-outlined text-[18px] text-tertiary">my_location</span>
            <span>Detectar mi ubicación automáticamente</span>
          `;
        },
        { timeout: 10000 }
      );
    });
  }

  // Chips de filtro rápido en el Hero
  const quickChips = document.querySelectorAll('.quick-chip');
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const category = chip.getAttribute('data-category');
      if (category === 'pets') {
        petSafeActive = true;
        updatePetState();
      } else if (category === 'lowlight') {
        const lightSelect = document.getElementById('lightSelect');
        if (lightSelect) lightSelect.value = 'low-light';
        updateResultCounts(filterCards());
      } else if (category === 'beginner' || category === 'air') {
        // Alterna la categoría: si ya estaba activa, la desactiva
        activeCategory = activeCategory === category ? null : category;
        updateResultCounts(filterCards());
      }

      const evalSection = document.getElementById('evaluador');
      if (evalSection) {
        evalSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Botón "Calcular compatibilidad"
  if (calculateBtn) {
    calculateBtn.addEventListener('click', () => {
      calculateBtn.innerHTML = `
        <span class="material-symbols-outlined text-[20px] animate-spin">refresh</span>
        <span>Calculando especies compatibles...</span>
      `;

      setTimeout(() => {
        const resultsCount = filterCards();
        updateResultCounts(resultsCount);

        const plantGrid = document.getElementById('plantGrid');
        if (plantGrid) {
          // Desplazamiento fluido compensando los 80px de la cabecera fija
          const headerOffset = 90;
          const elementPosition = plantGrid.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }, 300);
    });
  }

  // ==========================================
  // 3. NAVEGACIÓN Y SCROLL SPY EN ENCABEZADOS
  // ==========================================
  // Todos los enlaces con data-path navegan (header y footer); el resaltado activo
  // (scroll spy) solo aplica a los del menú principal.
  const allPathLinks = document.querySelectorAll('a[data-path]');
  const navLinks = document.querySelectorAll('header nav a[data-path]');
  const activeClasses = ['bg-secondary-container', 'text-on-secondary-container', 'rounded-full', 'px-space-md', 'py-space-xs'];
  const inactiveClasses = ['text-on-surface-variant', 'hover:text-on-surface'];

  allPathLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-path');
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
        const headerOffset = 80;
        const elementPosition = targetSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    });
  });

  const sections = Array.from(navLinks)
    .map(link => document.getElementById(link.getAttribute('data-path')))
    .filter(section => section !== null);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const currentId = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          if (link.getAttribute('data-path') === currentId) {
            link.classList.remove(...inactiveClasses);
            link.classList.add(...activeClasses);
          } else {
            link.classList.remove(...activeClasses);
            link.classList.add(...inactiveClasses);
          }
        });
      }
    });
  }, { rootMargin: '-80px 0px -40% 0px', threshold: 0 });

  sections.forEach(section => observer.observe(section));

  // ==========================================
  // 4. DIAGNÓSTICO DE SUPERVIVENCIA
  // ==========================================
  const plantDatabase = {
    'monstera': {
      risk: '15% Riesgo Bajo',
      desc: 'Excelente tolerancia en tu salón. Necesitará riego moderado y luz brillante indirecta.',
      fixes: ['• Limpiar el polvo de sus hojas mensualmente', '• Tutor de musgo para crecimiento erguido'],
      badgeColor: 'bg-secondary-container text-on-secondary-container'
    },
    'calathea': {
      risk: '45% Riesgo Medio',
      desc: 'Sensible al agua del grifo con cal. Los bordes se quemarán si la humedad baja del 55%.',
      fixes: ['• Usar agua filtrada o destilada', '• Humidificador ultrasónico constante'],
      badgeColor: 'bg-primary-fixed text-on-primary-fixed'
    },
    'ficus': {
      risk: '64% Riesgo Moderado',
      desc: 'En tu clima y calefacción actual, perderá hojas inferiores por shock de humedad (<45%) y corrientes frías.',
      fixes: ['• Humidificador ultrasónico a 1 metro', '• Lámpara LED de cultivo 4h/día'],
      badgeColor: 'bg-primary-fixed text-on-primary-fixed'
    },
    'sansevieria': {
      risk: '2% Riesgo Mínimo',
      desc: 'Prácticamente garantizada en tu espacio. Tolera descuidos de riego y rincones alejados.',
      fixes: ['• Sustrato con 40% de perlita o piedra pómez', '• Regar solo cuando la maceta no pese'],
      badgeColor: 'bg-tertiary-container text-on-tertiary-container'
    },
    'pothos': {
      risk: '8% Riesgo Muy Bajo',
      desc: 'Muy tolerante a la mayoría de condiciones de interior, incluso con luz media-baja.',
      fixes: ['• Podar guías largas para forzar ramificación', '• Puede enraizar y vivir en agua'],
      badgeColor: 'bg-tertiary-container text-on-tertiary-container'
    },
    'zamioculcas': {
      risk: '3% Riesgo Mínimo',
      desc: 'Casi indestructible. Tolera olvidos de riego y rincones con poca luz.',
      fixes: ['• Regar solo cuando el sustrato esté completamente seco', '• Evitar encharcamiento en el plato'],
      badgeColor: 'bg-tertiary-container text-on-tertiary-container'
    },
    'peperomia': {
      risk: '10% Riesgo Bajo',
      desc: 'Compacta y resistente, tolera bien ambientes con poca humedad.',
      fixes: ['• Sustrato bien drenado', '• Dejar secar completamente entre riegos'],
      badgeColor: 'bg-tertiary-container text-on-tertiary-container'
    }
  };

  const targetPlantInput = document.getElementById('targetPlantInput');
  const checkSurvivalBtn = document.getElementById('checkSurvivalBtn');
  const survivalResultBox = document.getElementById('survivalResultBox');

  if (checkSurvivalBtn && targetPlantInput && survivalResultBox) {
    checkSurvivalBtn.addEventListener('click', () => {
      const query = targetPlantInput.value.toLowerCase().trim();
      let match = null;

      for (let key in plantDatabase) {
        if (query.includes(key)) {
          match = plantDatabase[key];
          break;
        }
      }

      // Si no reconocemos la especie, lo decimos en vez de fingir un dato exacto
      const isApproximate = !match;
      if (!match) match = plantDatabase['ficus'];

      const plantName = escapeHtml(targetPlantInput.value || 'Planta');
      const fixesHtml = match.fixes.map(fix => `<span class="font-body-sm text-body-sm text-on-surface">${escapeHtml(fix)}</span>`).join('');
      const approximateNote = isApproximate
        ? `<p class="font-body-sm text-body-sm text-tertiary mt-2 flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">info</span> No tenemos ficha exacta para esta especie: te mostramos un perfil de riesgo orientativo (Ficus Lyrata).</p>`
        : '';

      survivalResultBox.innerHTML = `
        <div class="flex items-start gap-space-md">
          <div class="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-[24px]">verified</span>
          </div>
          <div>
            <div class="flex items-center gap-space-xs">
              <span class="font-headline-sm text-headline-sm text-on-surface font-semibold capitalize">${plantName}</span>
              <span class="${match.badgeColor} text-label-sm font-label-sm px-space-sm py-0.5 rounded-full">${match.risk}</span>
            </div>
            <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">
              ${match.desc}
            </p>
            ${approximateNote}
          </div>
        </div>

        <div class="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col gap-1 w-full md:w-auto min-w-[240px]">
          <span class="font-label-sm text-label-sm uppercase text-tertiary flex items-center gap-1 font-bold">
            <span class="material-symbols-outlined text-[16px]">build_circle</span> Qué adaptar:
          </span>
          ${fixesHtml}
        </div>
      `;
    });
  }

  // Búsqueda en tiempo real del Hero
  const plantQuickSearch = document.getElementById('plantQuickSearch');
  if (plantQuickSearch) {
    plantQuickSearch.addEventListener('input', (event) => {
      const searchTerm = event.target.value.toLowerCase();
      plantCards.forEach(card => {
        const cardText = card.textContent.toLowerCase();
        card.style.display = cardText.includes(searchTerm) ? 'flex' : 'none';
      });
    });
  }

  // Inicializar la carga desde plants.json
  loadPlants();
});
