/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'

const app = createApp(App)

/**
 * Crée un favicon SVG en data URL et l'insère dans le <head>.
 * @param {string} color - couleur CSS (hex, rgb, var(...), ...)
 */
async function setSvgFavicon(color) {
  try {
    // Charge le fichier favicon.svg existant
    const response = await fetch('/favicon.svg');
    let svgContent = await response.text();
    
    // Remplace la couleur dans le SVG
    // La couleur actuelle est définie dans le style CSS du SVG
    svgContent = svgContent.replace(
      /fill:\s*rgb\([^)]+\)/g, 
      `fill: ${color}`
    );
    
    const url = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgContent);
  
    // Remplace ou crée le <link rel="icon">
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = url;
  } catch (error) {
    console.warn('Impossible de charger le favicon SVG:', error);
  }
}

// Détermine la couleur selon l'environnement
const isDev = import.meta.env.DEV;
const color = isDev 
  ? (import.meta.env.VITE_FAVICON_COLOR_DEV || '#Fa1722')  // Orange pour le développement
  : (import.meta.env.VITE_FAVICON_COLOR_PROD || '#1976D2'); // Bleu pour la production

// setSvgFavicon(color);

registerPlugins(app)

app.mount('#app')
