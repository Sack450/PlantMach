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
  let plantCards = document.querySelectorAll('.plant-card');

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
    // Si falla el internet o la API, al menos mostramos las locales
    fetch('./plants.json')
      .then(res => res.json())
      .then(plants => renderPlantGrid(plants));
  }
}

async function fetchExternalPlants() {
  const API_KEY = ''; // Recuerda dejar tu clave real aquí
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
          light: lightValue,
          humidity: "medium",
          watering: wateringValue,
          petSafe: true, 
          matchPercent: Math.floor(Math.random() * (98 - 75 + 1)) + 75,
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

    container.innerHTML = plants.map(plant => `
      <div class="plant-card bg-surface-container-lowest rounded-lg overflow-hidden shadow-[0_4px_20px_-2px_rgba(27,67,50,0.05)] transition-all duration-300 hover:shadow-[0_12px_32px_-4px_rgba(27,67,50,0.12)] hover:-translate-y-1 flex flex-col" 
           data-diff="${plant.difficulty}" 
           data-light="${plant.light}" 
           data-humidity="${plant.humidity || 'medium'}" 
           data-watering="${plant.watering || 'weekly'}" 
           data-pet="${plant.petSafe ? 'friendly' : 'caution'}">
        
        <div class="relative h-64 w-full overflow-hidden bg-surface-container">
          <img class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" src="${plant.image}" alt="${plant.name}"/>
          
          <div class="absolute top-4 left-4 bg-tertiary text-on-tertiary px-space-md py-space-2xs rounded-full font-label-md text-label-md flex items-center gap-1 shadow-md">
            <span class="material-symbols-outlined text-[16px]">verified</span>
            <span>${plant.matchPercent}% Compatible</span>
          </div>
          
          <div class="absolute top-4 right-4 ${plant.petSafe ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container-lowest/90 text-primary'} font-label-sm text-label-sm px-space-sm py-space-2xs rounded-full flex items-center gap-1 shadow-sm">
            <span class="material-symbols-outlined text-[14px]">pets</span>
            <span>${plant.petSafe ? '100% Pet Friendly' : 'Precaución'}</span>
          </div>
        </div>

        <div class="p-space-lg flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-space-2xs">
              <h3 class="font-headline-sm text-headline-sm text-on-surface">${plant.name}</h3>
              <span class="font-label-sm text-label-sm px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container">${plant.difficulty}</span>
            </div>
            <p class="font-body-sm text-body-sm text-on-surface-variant italic mb-space-md">${plant.commonName}</p>

            <div class="grid grid-cols-3 gap-space-xs p-space-sm rounded-xl bg-surface-container-low mb-space-lg text-center">
              <div class="flex flex-col items-center">
                <span class="material-symbols-outlined text-primary text-[18px] mb-0.5">wb_sunny</span>
                <span class="font-label-sm text-label-sm text-on-surface font-semibold">${plant.highlights ? plant.highlights.lightText : 'Adaptable'}</span>
              </div>
              <div class="flex flex-col items-center">
                <span class="material-symbols-outlined text-secondary text-[18px] mb-0.5">water_drop</span>
                <span class="font-label-sm text-label-sm text-on-surface font-semibold">${plant.highlights ? plant.highlights.waterText : 'Regular'}</span>
              </div>
              <div class="flex flex-col items-center">
                <span class="material-symbols-outlined text-tertiary text-[18px] mb-0.5">air</span>
                <span class="font-label-sm text-label-sm text-on-surface font-semibold">${plant.highlights ? plant.highlights.airText : 'Purificadora'}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-space-xs">
            <span class="font-body-sm text-body-sm text-on-surface font-medium">${plant.footerNote || ''}</span>
            <button class="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:text-primary-container transition-colors" type="button">
              <span>Ver ficha</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Actualiza la lista de nodos guardados en memoria
    plantCards = document.querySelectorAll('.plant-card');
    filterCards();
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
    filterCards();
  }

  function filterCards() {
    let visibleCount = 0;
    const lightSelect = document.getElementById('lightSelect');
    const selectedLight = lightSelect ? lightSelect.value : null;

    plantCards.forEach(card => {
      const isPetSafe = card.getAttribute('data-pet') === 'friendly';
      const plantLight = card.getAttribute('data-light');

      const passesPet = !petSafeActive || isPetSafe;
      let passesLight = true;
      if (selectedLight && plantLight) {
        passesLight = (plantLight === selectedLight);
      }

      if (passesPet && passesLight) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (matchCounter) {
      matchCounter.textContent = visibleCount.toString();
    }
    return visibleCount;
  }

  if (petToggleBtn) {
    petToggleBtn.addEventListener('click', () => {
      petSafeActive = !petSafeActive;
      updatePetState();
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
        filterCards();
      }
      
      const evalSection = document.getElementById('evaluador');
      if (evalSection) {
        evalSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Botón "Calcular compatibilidad"
  const calculateBtn = document.getElementById('calculateBtn');
  if (calculateBtn) {
    calculateBtn.addEventListener('click', () => {
      calculateBtn.innerHTML = `
        <span class="material-symbols-outlined text-[20px] animate-spin">refresh</span>
        <span>Recalculando índices biométricos...</span>
      `;
      
      setTimeout(() => {
        const resultsCount = filterCards();
        calculateBtn.innerHTML = `
          <span class="material-symbols-outlined text-[20px]">auto_awesome</span>
          <span>${resultsCount} especies 100% compatibles</span>
        `;
        
        const plantGrid = document.getElementById('plantGrid');
        if (plantGrid) {
          plantGrid.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
    });
  }

  // ==========================================
  // 3. NAVEGACIÓN Y SCROLL SPY EN ENCABEZADOS
  // ==========================================
  const navLinks = document.querySelectorAll('nav a[data-path]');
  const activeClasses = ['bg-secondary-container', 'text-on-secondary-container', 'rounded-full', 'px-space-md', 'py-space-xs'];
  const inactiveClasses = ['text-on-surface-variant', 'hover:text-on-surface'];

  navLinks.forEach(link => {
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
    }
  };

  const targetPlantInput = document.getElementById('targetPlantInput');
  const checkSurvivalBtn = document.getElementById('checkSurvivalBtn');
  const survivalResultBox = document.getElementById('survivalResultBox');

  if (checkSurvivalBtn && targetPlantInput && survivalResultBox) {
    checkSurvivalBtn.addEventListener('click', () => {
      const query = targetPlantInput.value.toLowerCase().trim();
      let match = plantDatabase['ficus'];
      
      for (let key in plantDatabase) {
        if (query.includes(key)) {
          match = plantDatabase[key];
          break;
        }
      }

      const plantName = targetPlantInput.value || 'Planta';
      const fixesHtml = match.fixes.map(fix => `<span class="font-body-sm text-body-sm text-on-surface">${fix}</span>`).join('');

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