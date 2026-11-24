import { defineStore } from 'pinia';

/**
 * Fenêtre d'assistance (contacter un administrateur) : un seul état pour tous les points d'entrée (barre, tiroirs, alertes, création de compte),
 * la fenêtre est montée une fois dans App.vue.
 * @module assistanceStore
 */
export const useAssistanceStore = defineStore('assistance', () => {
  const isOpen = ref(false);

  const open = () => {
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
  };

  return { isOpen, open, close };
});
