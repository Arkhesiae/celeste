import { defineStore } from 'pinia';

/**
 * Fenêtres globales (montées une fois dans App.vue) qu'on ouvre depuis n'importe où, y compris hors d'un composant (`apiFetch`) :
 * une seule à la fois, désignée par son nom, avec ses données.
 * Volontairement sans `emptyStore` : la déconnexion, qui vide les stores, ne doit pas refermer la fenêtre qui l'explique.
 * @module dialogStore
 */
export const useDialogStore = defineStore('dialog', () => {
  const current = ref(null);
  const props = ref({});

  const open = (name, data = {}) => {
    props.value = data;
    current.value = name;
  };

  const close = () => {
    current.value = null;
  };

  const isOpen = (name) => current.value === name;

  return { current, props, open, close, isOpen };
});
