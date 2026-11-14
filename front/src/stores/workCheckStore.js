import { defineStore } from 'pinia';
import { ref } from 'vue';
import { userService } from '@/services/userService';
import { withDemoIssues } from '@/utils/workCheckDemo';

/**
 * Contrôle du temps de travail de l'utilisateur pour la période affichée par le calendrier : temps travaillé par jour,
 * repos avant chaque vacation, périodes de 7 jours glissantes. Les règles sont celles du serveur (voir
 * backend/services/user/user.workCheck.js) ; ce store ne fait que charger et garder le résultat.
 * @module workCheckStore
 */
export const useWorkCheckStore = defineStore('workCheck', () => {
  const daysByDate = ref({});
  const windows = ref([]);
  const limits = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

  // Une réponse plus ancienne que la dernière demande (le mois a changé entre-temps) est ignorée
  let lastRequest = 0;

  /**
   * @param {string} userId
   * @param {string} from - premier jour affiché
   * @param {string} to - dernier jour affiché
   * @param {{ demo?: boolean }} [options] - `demo` : ajoute des alertes d'exemple (développement uniquement)
   */
  const fetchWorkCheck = async (userId, from, to, { demo = false } = {}) => {
    const request = ++lastRequest;
    isLoading.value = true;
    error.value = null;
    try {
      let data = await userService.fetchWorkCheck(userId, from, to);
      if (demo && import.meta.env.DEV) data = withDemoIssues(data);
      if (request !== lastRequest) return;
      daysByDate.value = Object.fromEntries(data.days.map((day) => [day.date, day]));
      windows.value = data.windows;
      limits.value = data.limits;
    } catch (err) {
      // Un échec ne doit pas gêner le calendrier : les indicateurs disparaissent, rien d'autre
      if (request === lastRequest) {
        error.value = err.message || 'Impossible de contrôler le temps de travail.';
        daysByDate.value = {};
        windows.value = [];
      }
    } finally {
      if (request === lastRequest) isLoading.value = false;
    }
  };

  const reset = () => {
    lastRequest++;
    daysByDate.value = {};
    windows.value = [];
    limits.value = null;
    isLoading.value = false;
    error.value = null;
  };

  return { daysByDate, windows, limits, isLoading, error, fetchWorkCheck, reset };
});
