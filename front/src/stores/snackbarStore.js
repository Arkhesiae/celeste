import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';

/**
 * Store Pinia pour gérer l'état des notifications snackbar.
 * @module snackbarStore
 */
export const useSnackbarStore = defineStore('snackbar', () => {
  // State
  const message = ref('');
  const color = ref('success');
  const icon = ref('mdi-check-circle');
  const show = ref(false);
  const timeout = ref(3000);
  const messageQueue = ref([]);


  // Actions

  const pushQueue = (newText) => {
    messageQueue.value.push(newText)
  }

  /**
   * Affiche un message de succès.
   * @param {string} msg - Le message à afficher.
   */
  const showSuccess = (msg) => {
    message.value = msg;
    color.value = 'success';
    icon.value = 'mdi-check-circle';
    show.value = true;
    setTimeout(() => {
      show.value = false;
    }, timeout.value);
  };

  /**
   * Affiche un message d'erreur.
   * @param {string} msg - Le message à afficher.
   */
  const showError = (msg) => {
    message.value = msg;
    color.value = 'error';
    icon.value = 'mdi-close-circle';
    show.value = true;
    setTimeout(() => {
      show.value = false;
    }, timeout.value);
  };

  /**
   * Affiche un message d'information.
   * @param {string} msg - Le message à afficher.
   */
  const showInfo = (msg) => {
    message.value = msg;
    color.value = 'info';
    icon.value = 'mdi-information';
    show.value = true;
    setTimeout(() => {
      show.value = false;
    }, timeout.value);
  };

  const showNotification = (newText, newColor = 'success', newIcon = 'mdi-check-circle', newTimeout = 3000) => {
    messageQueue.value.push({
      message: newText,
      icon: newIcon,
      timeout: newTimeout,
      iconColor:  newColor,
    })
    message.value = newText;
    color.value = newColor;
    icon.value = newIcon;
    timeout.value = newTimeout;
    show.value = true;
  }

  /**
   * Cache le snackbar.
   */
  const hide = () => {
    show.value = false;
  };

  const showMessage = (message, type = 'info') => {
    const id = Date.now();
    messageQueue.value.push({ id, message, type });
    setTimeout(() => {
      messageQueue.value = messageQueue.value.filter(msg => msg.id !== id);
    }, 3000);
  };

  return {
    // State
    message,
    color,
    icon,
    messageQueue,
    show,
    timeout,
    // Actions  
    showSuccess,
    showError,
    showInfo,
    pushQueue,
    showNotification,
    hide
  };
});
