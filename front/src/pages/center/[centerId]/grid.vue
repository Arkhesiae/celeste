<template>
  <v-container class="pb-8">
    <MainTitle :title="team?.name ? `Grille · ${team.name}` : 'Grille'" :subtitle="rangeLabel" back-button />

    <!-- Barre d'outils : équipe, nombre de jours affichés, navigation -->
    <div class="d-flex flex-wrap align-center ga-2 mb-4">
      <v-select
        v-model="selectedTeamId"
        :items="teams"
        item-title="name"
        item-value="_id"
        label="Équipe"
        variant="solo"
        flat
        rounded="xl"
        density="compact"
        hide-details
        class="team-select"
      />

      <v-btn-toggle v-if="spans.length > 1" v-model="span" mandatory density="comfortable" rounded="xl" variant="outlined" color="primary" divided>
        <v-btn v-for="option in spans" :key="option" :value="option">
          {{ option }} j
        </v-btn>
      </v-btn-toggle>

      <v-spacer />

      <v-btn icon="mdi-chevron-left" variant="text" aria-label="Période précédente" @click="slide(-1)" />
      <v-btn variant="tonal" rounded="xl" @click="goToToday">
        Aujourd'hui
      </v-btn>
      <v-btn icon="mdi-chevron-right" variant="text" aria-label="Période suivante" @click="slide(1)" />
    </div>

    <!-- Balayer à gauche / à droite change la période (Swiper) ; la colonne des noms reste fixe -->
    <v-card
      rounded="xl"
      variant="flat"
      class="grid-card"
      color="transparent"
    >
      <v-progress-linear v-if="loading" indeterminate color="primary" />
      <TeamGrid
        v-if="startDate"
        ref="gridRef"
        :members="grid?.members ?? []"
        :team-shifts="grid?.teamShifts ?? {}"
        :start-date="startDate"
        :span="span"
        :today="today"
        @move="move"
      />
      <v-alert v-if="errorMessage" type="error" variant="tonal" class="ma-4">
        {{ errorMessage }}
      </v-alert>
    </v-card>
  </v-container>
</template>

<script setup>
import { Temporal } from '@js-temporal/polyfill';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useTeamStore } from '@/stores/teamStore';
import { useCenterStore } from '@/stores/centerStore';

const SPANS = [6, 12, 24];
const MOBILE_SPAN = 6;
const DEFAULT_TIME_ZONE = 'Europe/Paris';

const route = useRoute();
const router = useRouter();
const teamStore = useTeamStore();
const centerStore = useCenterStore();
const centerId = route.params.centerId;

const teams = computed(() => [...teamStore.centerTeams].sort((a, b) => a.order - b.order));
const timeZone = computed(() => centerStore.centers.find((c) => c._id === centerId)?.timeZone || DEFAULT_TIME_ZONE);

// Sur mobile, une seule durée : 6 jours
const { smAndDown } = useDisplay();
const spans = computed(() => (smAndDown.value ? [MOBILE_SPAN] : SPANS));

const initialSpan = Number(route.query.span);
const span = ref(smAndDown.value ? MOBILE_SPAN : (SPANS.includes(initialSpan) ? initialSpan : 12));
watch(smAndDown, (mobile) => { if (mobile) span.value = MOBILE_SPAN; });

const gridRef = ref(null);
const selectedTeamId = ref(typeof route.query.team === 'string' ? route.query.team : null);
const team = computed(() => teams.value.find((t) => t._id === selectedTeamId.value) ?? null);

// Dates en chaînes YYYY-MM-DD : le jour courant est celui du fuseau du centre
const today = ref(null);
const startDate = ref(null);
const grid = ref(null);
const loading = ref(false);
const errorMessage = ref('');

const endDate = computed(() => (startDate.value
  ? Temporal.PlainDate.from(startDate.value).add({ days: span.value - 1 }).toString()
  : null));

const rangeLabel = computed(() => {
  if (!startDate.value) return '';
  const format = (key) => Temporal.PlainDate.from(key).toLocaleString('fr-FR', { day: 'numeric', month: 'short' });
  return `${format(startDate.value)} → ${format(endDate.value)}`;
});

// Boutons : le Swiper anime le glissement, puis TeamGrid émet `move` une fois arrivé
const slide = (direction) => gridRef.value?.slideBy(direction);

// Décale la période affichée (appelé à la fin d'un glissement)
const move = (direction) => {
  startDate.value = Temporal.PlainDate.from(startDate.value).add({ days: direction * span.value }).toString();
};

const goToToday = () => {
  today.value = Temporal.Now.plainDateISO(timeZone.value).toString();
  startDate.value = today.value;
};

let requestId = 0;
const loadGrid = async () => {
  if (!selectedTeamId.value || !startDate.value) return;
  const current = ++requestId;
  loading.value = true;
  errorMessage.value = '';
  try {
    // Trois périodes d'un coup (précédente, courante, suivante) pour que le glissement ait déjà ses données
    const first = Temporal.PlainDate.from(startDate.value).subtract({ days: span.value }).toString();
    const last = Temporal.PlainDate.from(startDate.value).add({ days: 2 * span.value - 1 }).toString();
    const data = await teamStore.fetchTeamGrid(selectedTeamId.value, first, last);
    if (current === requestId) grid.value = data;
  } catch (error) {
    if (current === requestId) {
      grid.value = null;
      errorMessage.value = error.message || 'Erreur lors du chargement de la grille';
    }
  } finally {
    if (current === requestId) loading.value = false;
  }
};

watch(span, () => {
  router.replace({ query: { ...route.query, span: String(span.value) } });
});

watch(selectedTeamId, (id) => {
  grid.value = null;   // ne pas afficher les membres de l'équipe précédente pendant le chargement
  router.replace({ query: { ...route.query, team: id } });
});

watch([selectedTeamId, startDate, span], loadGrid);

// Le jour courant change à minuit (fuseau du centre) si la page reste ouverte
let timer = null;
onMounted(async () => {
  await Promise.all([teamStore.fetchCenterTeams(centerId), centerStore.fetchCenters()]);
  if (!team.value) selectedTeamId.value = teams.value[0]?._id ?? null;
  goToToday();
  timer = setInterval(() => { today.value = Temporal.Now.plainDateISO(timeZone.value).toString(); }, 60000);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<style scoped>
.team-select {
  max-width: 240px;
  min-width: 160px;
}

.grid-card {
  overflow: hidden;
}
</style>
