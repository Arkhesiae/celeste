<template>
  <!-- Les 7 prochains jours à partir d'aujourd'hui : travail cumulé et plus long repos, comparés aux limites du serveur (la tuile du calendrier,
       sans ses commandes). Rien ne s'affiche tant que le serveur n'a pas répondu, ni s'il échoue : le tableau de bord n'en a pas besoin. -->
  <section v-if="limits" class="mb-4">
    <div class="d-flex align-center justify-space-between ga-4 mb-2">
      <div class="d-flex flex-column" style="min-width: 0">
        <span class="text-title-large font-weight-medium">Mes 7 prochains jours</span>
        <span class="text-body-small text-medium-emphasis">Travail et repos à venir, à partir d'aujourd'hui</span>
      </div>
      <UndrawChilling class="art-illustration art-illustration--static flex-none" style="width: 110px" />
    </div>

    <WorkWindowTile
      headerless
      controls-disabled
      :window-start="start"
      :windows="windows"
      :days-by-date="daysByDate"
      :limits="limits"
    />
  </section>
</template>

<script setup>
import { Temporal } from 'temporal-polyfill';
import { useAuthStore } from '@/stores/authStore.js';
import { userService } from '@/services/userService.js';
import { useCenterStore } from '@/stores/centerStore.js';

const DEFAULT_TIME_ZONE = 'Europe/Paris';

const authStore = useAuthStore();
const centerStore = useCenterStore();

// Chargé ici et non dans `workCheckStore` : ce store garde la période du calendrier affiché, que cette tuile ne doit ni changer ni suivre
// « Aujourd'hui » est le jour du centre, comme pour le serveur, pas celui du navigateur
const start = ref('');

const windows = ref([]);
const daysByDate = ref({});
const limits = ref(null);

onMounted(async () => {
  try {
    if (!centerStore.centers.length) await centerStore.fetchCenters().catch(() => {});
    const timeZone = centerStore.centers.find((c) => c._id === authStore.userData.centerId)?.timeZone || DEFAULT_TIME_ZONE;
    const today = Temporal.Now.plainDateISO(timeZone);
    const end = today.add({ days: 6 }).toString();
    const data = await userService.fetchWorkCheck(authStore.userData.userId, today.toString(), end);
    start.value = today.toString();
    windows.value = data.windows;
    daysByDate.value = Object.fromEntries(data.days.map((day) => [day.date, day]));
    limits.value = data.limits;
  } catch {
    // Pas de contrôle possible : la tuile reste cachée
  }
});
</script>
