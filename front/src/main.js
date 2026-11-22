/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins';
// Components
import App from './App.vue';

// Composables
import { createApp } from 'vue';

import './styles/fonts.css';
import './styles/transitions.css';
import './styles/listitem.css';
import './styles/tile.css';
import './styles/day.css';
import './styles/dot.css';
import './styles/art.css';

const app = createApp(App);

registerPlugins(app);

app.mount('#app');
