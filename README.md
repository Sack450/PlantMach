PlantMatch - Inteligencia Botánica y CompatibilidadPlantMatch es una aplicación web interactiva diseñada para evaluar las condiciones ambientales reales de tu hogar (clima, iluminación, humedad, riego y seguridad para mascotas) y recomendar las especies botánicas con mayor porcentaje de adaptabilidad científica.  Características PrincipalesDiagnóstico Ambiental en Vivo: Evaluador de múltiples parámetros interactivos para calcular métricas de compatibilidad botánica en tiempo real.  Catálogo Híbrido Asistido: Sistema que combina recomendaciones locales curadas con especies globales sincronizadas vía API.  Filtros de Seguridad para Mascotas: Alternador rápido para ocultar o mostrar especies 100% no tóxicas para perros y gatos.  Comprobador Quirúrgico de Supervivencia: Módulo para consultar fichas técnicas específicas e identificar micro-ajustes necesarios (humificadores, iluminación espectral, sustratos) antes de adquirir una planta.  Navegación Dinámica (Scroll Spy): Menú inteligente que detecta la sección activa de la página aplicando animaciones de diseño fluídas.  Tecnologías UtilizadasHTML5 / Estructura Semántica  Tailwind CSS (CDN & Configuración Personalizada)  JavaScript (ES6+ / Async-Await / Fetch API)  Google Fonts & Material Symbols  Instalación y Configuración LocalClona este repositorio en tu máquina local:Bashgit clone https://github.com/Sack450/PlantMach.git
# Abre la carpeta del proyecto en tu entorno de desarrollo (como Visual Studio Code).Asegúrate de contar con los archivos principales en la raíz del directorio:index.html  plants.json  Carpeta js/app.js  Carpeta css/styles.css y js/tailwind.config.js  Ejecuta el proyecto utilizando un servidor local (como la extensión Live Server en VS Code).Estructura del ProyectoPlaintextPlantMach/
│
├── index.html          ## Estructura principal de la interfaz
├── plants.json         ## Dataset local de plantas de respaldo y estrella
├── js/
│   ├── app.js          ## Lógica de filtrado, fetch híbrido y scroll spy
│   └── tailwind.config.js # Configuración del sistema de diseño y paleta de colores
└── css/
    └── styles.css      ## Estilos base personalizados y utilidades de renderizado
Créditos
Proyecto desarrollado como parte de soluciones interactivas de ingeniería web y biometeorología aplicada al hogar.
