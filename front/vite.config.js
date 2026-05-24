import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import {transformAssetUrls} from 'vite-plugin-vuetify'
import VueRouter from 'vue-router/vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import Vue from "@vitejs/plugin-vue";
import Vuetify from "vite-plugin-vuetify";
import svgLoader from 'vite-svg-loader'
import Components from "unplugin-vue-components/vite";
import Fonts from "unplugin-fonts/vite";
import AutoImport from "unplugin-auto-import/vite";

export default defineConfig({
  base: '/',
  plugins: [
    VueRouter(),
    Layouts({
      inheritDefaultLayout: false
    }),
    Vue({
      template: { transformAssetUrls }
    }),
    Vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),
    Components(),
    Fonts({
      google: {
        families: [{
          name: 'Roboto',
          styles: 'wght@100;300;400;500;700;900',
        }],
      },
    }),
    svgLoader(),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
      ],
      eslintrc: {
        enabled: true,
        filepath: './.eslintrc-auto-import.json',
        globalsPropValue: true,
      },
      vueTemplate: true,
    }),
  ],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    port: 30035,
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: 'modern-compiler',
      },
    },
  },
})
