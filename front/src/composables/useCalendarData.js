import { useShiftStore } from '@/stores/shiftStore.js';
import { useSubstitutionStore } from '@/stores/substitutionStore.js';
import { useSnackbarStore } from '@/stores/snackbarStore.js';
import { useWorkCheckStore } from '@/stores/workCheckStore.js';
import { useAuthStore } from '@/stores/authStore.js';

/**
 * @param calendarDays semaines du mois affiché
 * @param neighbors `{ previousDays, nextDays }` (ref ou computed) ou `null` : avec les mois voisins, les vacations et les demandes
 *   sont chargées de la grille du mois précédent à celle du mois suivant, pour que le calendrier mobile les montre pendant le
 *   glissement ; le contrôle du temps de travail (62 jours au plus côté serveur) reste celui du mois affiché
 */
export function useCalendarData(calendarDays, neighbors = null) {
  const shiftStore = useShiftStore();
  const substitutionStore = useSubstitutionStore();
  const snackbarStore = useSnackbarStore();
  const workCheckStore = useWorkCheckStore();
  const authStore = useAuthStore();

  const loadingShifts = ref(false);
  const loadingSubstitutions = ref(false);
  const loading = computed(() => loadingShifts.value || loadingSubstitutions.value);

  const startDate = computed(() => {
    if (!calendarDays.value || calendarDays.value.length === 0) {
      return null;
    }
    return calendarDays.value[0][0].date.toString();
  });

  const endDate = computed(() => {
    if (!calendarDays.value || calendarDays.value.length === 0) {
      return null;
    }
    return calendarDays.value[calendarDays.value.length - 1][6].date.toString();
  });

  // Période des vacations et des demandes : le mois affiché, élargi aux mois voisins quand ils sont fournis
  const rangeStart = computed(() => neighbors?.value?.previousDays?.[0]?.[0]?.date.toString() ?? startDate.value);
  const rangeEnd = computed(() => {
    const next = neighbors?.value?.nextDays;
    return next?.length ? next[next.length - 1][6].date.toString() : endDate.value;
  });

  const fetchShifts = async () => {
    loadingShifts.value = true;
    try {
      await shiftStore.fetchShiftsWithSubstitutions({ startDate: rangeStart.value, endDate: rangeEnd.value });
    } catch (err) {
      snackbarStore.showNotification(err.message, 'onError', 'mdi-alert-outline');
      throw err;
    } finally {
      setTimeout(() => {
        loadingShifts.value = false;
      }, 400);
    }
  };

  const fetchSubstitutions = async () => {
    loadingSubstitutions.value = true;
    try {
      await substitutionStore.fetchAllDemands({ startDate: rangeStart.value, endDate: rangeEnd.value });
    } catch (err) {
      snackbarStore.showNotification(
        'Erreur lors du chargement des substitutions : ' + err.message,
        'onError',
        'mdi-alert-outline',
      );
      throw err;
    } finally {
      setTimeout(() => {
        loadingSubstitutions.value = false;
      }, 400);
    }
  };

  // Contrôle du temps de travail de la période affichée : un échec n'empêche pas d'afficher le calendrier (le store l'absorbe)
  const fetchWorkCheck = () => workCheckStore.fetchWorkCheck(authStore.userData.userId, startDate.value, endDate.value);

  const fetchMonthData = async () => {
    try {
      await Promise.all([fetchShifts(), fetchSubstitutions(), fetchWorkCheck()]);
    } catch (err) {
      snackbarStore.showNotification(err.message, 'onError', 'mdi-alert-outline');
      throw err;
    }
  };

  watch(calendarDays, async (newCalendarDays) => {
    if (newCalendarDays?.length > 0) {
      await fetchMonthData();
    }
  });

  return { loading, loadingShifts, loadingSubstitutions, fetchMonthData };
}
