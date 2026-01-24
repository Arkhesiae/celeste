/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'
import longPress from '@/directives/v-long-press.js'
// Components
import App from './App.vue'
import 'material-symbols';
// Composables
import { createApp } from 'vue'

import './styles/fonts.css';

const app = createApp(App)


app.directive('long-press', longPress)
registerPlugins(app)

app.mount('#app')
