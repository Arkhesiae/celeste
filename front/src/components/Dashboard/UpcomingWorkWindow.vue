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
import { todayKey } from '@/utils/dayFields.js';

const authStore = useAuthStore();

// Chargé ici et non dans `workCheckStore` : ce store garde la période du calendrier affiché, que cette tuile ne doit ni changer ni suivre
const start = todayKey();
const end = Temporal.PlainDate.from(start).add({ days: 6 }).toString();

const windows = ref([]);
const daysByDate = ref({});
const limits = ref(null);

onMounted(async () => {
  try {
    const data = await userService.fetchWorkCheck(authStore.userData.userId, start, end);
    windows.value = data.windows;
    daysByDate.value = Object.fromEntries(data.days.map((day) => [day.date, day]));
    limits.value = data.limits;
  } catch {
    // Pas de contrôle possible : la tuile reste cachée
  }
});
</script>
