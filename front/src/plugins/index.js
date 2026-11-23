/**
 * plugins/index.js
 *
 * Automatically included in `./src/main.js`
 */

// Plugins
import vuetify from './vuetify';
import pinia from '@/stores';
import router from '@/router';
import { scrollRestorationOptions } from '@/router/scrollRestoration.js';
import { ScrollRestoration } from 'vue-router/experimental';

export function registerPlugins(app) {
  // Le plugin de défilement s'installe avant le routeur
  app.use(vuetify).use(ScrollRestoration, scrollRestorationOptions(router)).use(router).use(pinia);
}
