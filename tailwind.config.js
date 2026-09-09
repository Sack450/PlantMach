/**
 * Configuración del sistema de diseño Tailwind CSS para PlantMatch.
 * Define la paleta de colores personalizada, bordes, espaciados, tipografías y escala de fuentes
 * para garantizar la consistencia visual de la aplicación.
 */
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
        "inverse-on-surface": "#f3f1eb",
        "on-primary-fixed": "#3c0800",
        "outline-variant": "#dbc1ba",
        "on-tertiary-container": "#003723",
        "surface-container-highest": "#e4e2dd",
        "on-background": "#1b1c18",
        "surface": "#fbf9f3",
        "primary-fixed": "#ffdbd2",
        "surface-tint": "#9a442d",
        "on-primary-container": "#5b1604",
        "secondary-fixed-dim": "#a5d0b9",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#436b58",
        "error": "#ba1a1a",
        "surface-variant": "#e4e2dd",
        "on-primary": "#ffffff",
        "tertiary-fixed": "#a1f4c8",
        "on-surface-variant": "#55423e",
        "tertiary": "#116c4a",
        "surface-container-lowest": "#ffffff",
        "error-container": "#ffdad6",
        "surface-container": "#f0eee8",
        "on-tertiary": "#ffffff",
        "primary-fixed-dim": "#ffb4a1",
        "on-secondary-fixed": "#002114",
        "tertiary-fixed-dim": "#86d7ad",
        "on-secondary-fixed-variant": "#274e3d",
        "secondary-container": "#beead1",
        "on-error": "#ffffff",
        "on-surface": "#1b1c18",
        "inverse-primary": "#ffb4a1",
        "secondary": "#3f6653",
        "surface-bright": "#fbf9f3",
        "primary": "#9a442d",
        "on-primary-fixed-variant": "#7c2e19",
        "inverse-surface": "#30312d",
        "outline": "#88726d",
        "on-tertiary-fixed-variant": "#005236",
        "secondary-fixed": "#c1ecd4",
        "surface-dim": "#dcdad4",
        "surface-container-high": "#eae8e2",
        "primary-container": "#e07a5f",
        "background": "#fbf9f3",
        "on-tertiary-fixed": "#002113",
        "tertiary-container": "#56a67f",
        "on-error-container": "#93000a",
        "surface-container-low": "#f5f3ed"
      },
      "borderRadius": {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px"
      },
      "spacing": {
        "gutter-desktop": "1.5rem",
        "space-md": "1rem",
        "margin-mobile": "1.25rem",
        "space-lg": "1.5rem",
        "space-xs": "0.5rem",
        "space-2xl": "3rem",
        "gutter-mobile": "1rem",
        "margin-desktop": "3rem",
        "space-3xl": "4.5rem",
        "space-xl": "2rem",
        "space-sm": "0.75rem",
        "space-2xs": "0.25rem"
      },
      "fontFamily": {
        "headline-sm": ["Bricolage Grotesque"],
        "body-md": ["Karla"],
        "headline-lg": ["Bricolage Grotesque"],
        "label-md": ["Karla"],
        "label-sm": ["Karla"],
        "headline-md": ["Bricolage Grotesque"],
        "headline-xl-mobile": ["Bricolage Grotesque"],
        "headline-lg-mobile": ["Bricolage Grotesque"],
        "body-sm": ["Karla"],
        "headline-xl": ["Bricolage Grotesque"],
        "body-lg": ["Karla"]
      },
      "fontSize": {
        "headline-sm": ["22px", { "lineHeight": "28px", "letterSpacing": "0em", "fontWeight": "600" }],
        "body-md": ["16px", { "lineHeight": "24px", "letterSpacing": "0em", "fontWeight": "400" }],
        "headline-lg": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "label-md": ["14px", { "lineHeight": "18px", "letterSpacing": "0.04em", "fontWeight": "700" }],
        "label-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.06em", "fontWeight": "700" }],
        "headline-md": ["28px", { "lineHeight": "36px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "headline-xl-mobile": ["38px", { "lineHeight": "44px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "headline-lg-mobile": ["30px", { "lineHeight": "36px", "letterSpacing": "-0.01em", "fontWeight": "700" }],
        "body-sm": ["14px", { "lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "400" }],
        "headline-xl": ["56px", { "lineHeight": "64px", "letterSpacing": "-0.03em", "fontWeight": "700" }],
        "body-lg": ["18px", { "lineHeight": "28px", "letterSpacing": "-0.01em", "fontWeight": "400" }]
      }
    }
  }
};
