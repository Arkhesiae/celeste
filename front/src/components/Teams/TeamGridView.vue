<template>
  <div>
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

      <v-btn-toggle
        v-if="spans.length > 1"
        v-model="span"
        mandatory
        density="comfortable"
        rounded="xl"
        variant="outlined"
        color="primary"
        divided
      >
        <v-btn v-for="option in spans" :key="option" :value="option"> {{ option }} j </v-btn>
      </v-btn-toggle>

      <v-spacer />

      <v-btn icon="mdi-chevron-left" variant="text" aria-label="Période précédente" @click="slide(-1)" />
      <v-btn variant="tonal" rounded="xl" @click="goToToday"> Aujourd'hui </v-btn>
      <v-btn icon="mdi-chevron-right" variant="text" aria-label="Période suivante" @click="slide(1)" />
    </div>

    <!-- Balayer à gauche / à droite change la période (Swiper) ; la colonne des noms reste fixe -->
    <v-card variant="flat" class="grid-card" color="transparent">
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
      <div v-if="!loading && !errorMessage && grid && !grid.members.length" class="d-flex flex-column align-center ga-4 py-8">
        <UndrawTeamwork class="art-illustration art-illustration--static" style="width: 240px" />
        <span class="text-medium-emphasis text-title-small">Aucun membre sur cette période</span>
      </div>
      <v-alert v-if="errorMessage" type="error" class="ma-4">
        {{ errorMessage }}
      </v-alert>
    </v-card>
  </div>
</template>

<script setup>
import { Temporal } from '@js-temporal/polyfill';
import { useDisplay } from 'vuetify';
import { useTeamStore } from '@/stores/teamStore';
import { useCenterStore } from '@/stores/centerStore';
import { useAuthStore } from '@/stores/authStore';

// Grille d'une équipe (membres × jours) : la page /planning/grid et la fenêtre de la page des équipes l'utilisent toutes deux.
// Le composant ne touche pas à l'adresse : il signale ses choix par `change`, la page décide de les garder dans la requête.
const props = defineProps({
  centerId: {
    type: String,
    required: true,
  },
  /** Équipe affichée au départ ; sans elle, celle de l'utilisateur si elle est de ce centre, sinon la première */
  teamId: {
    type: String,
    default: null,
  },
  /** Nombre de jours affiché au départ (6, 12 ou 24) */
  span: {
    type: Number,
    default: 12,
  },
});

const emit = defineEmits(['change']);

const SPANS = [6, 12, 24];
const MOBILE_SPAN = 6;
const DEFAULT_TIME_ZONE = 'Europe/Paris';

const teamStore = useTeamStore();
const centerStore = useCenterStore();
const authStore = useAuthStore();

const teams = computed(() => [...teamStore.centerTeams].sort((a, b) => a.order - b.order));
const timeZone = computed(
  () => centerStore.centers.find((c) => c._id === props.centerId)?.timeZone || DEFAULT_TIME_ZONE,
);

// Sur mobile, une seule durée : 6 jours
const { smAndDown } = useDisplay();
const spans = computed(() => (smAndDown.value ? [MOBILE_SPAN] : SPANS));

const span = ref(smAndDown.value ? MOBILE_SPAN : SPANS.includes(props.span) ? props.span : 12);
watch(smAndDown, (mobile) => {
  if (mobile) span.value = MOBILE_SPAN;
});

const gridRef = ref(null);
const selectedTeamId = ref(props.teamId);
const team = computed(() => teams.value.find((t) => t._id === selectedTeamId.value) ?? null);

// Dates en chaînes YYYY-MM-DD : le jour courant est celui du fuseau du centre
const today = ref(null);
const startDate = ref(null);
const grid = ref(null);
const loading = ref(false);
const errorMessage = ref('');

const endDate = computed(() =>
  startDate.value
    ? Temporal.PlainDate.from(startDate.value)
        .add({ days: span.value - 1 })
        .toString()
    : null,
);

const rangeLabel = computed(() => {
  if (!startDate.value) return '';
  const format = (key) => Temporal.PlainDate.from(key).toLocaleString('fr-FR', { day: 'numeric', month: 'short' });
  return `${format(startDate.value)} → ${format(endDate.value)}`;
});

watch(
  [() => team.value?.name, rangeLabel, selectedTeamId, span],
  () =>
    emit('change', {
      teamName: team.value?.name ?? '',
      rangeLabel: rangeLabel.value,
      teamId: selectedTeamId.value,
      span: span.value,
    }),
  { immediate: true },
);

// Boutons : le Swiper anime le glissement, puis TeamGrid émet `move` une fois arrivé
const slide = (direction) => gridRef.value?.slideBy(direction);

// Décale la période affichée (appelé à la fin d'un glissement)
const move = (direction) => {
  startDate.value = Temporal.PlainDate.from(startDate.value)
    .add({ days: direction * span.value })
    .toString();
};

const goToToday = () => {
  today.value = Temporal.Now.plainDateISO(timeZone.value).toString();
  startDate.value = today.value;
};

let demandId = 0;
const loadGrid = async () => {
  if (!selectedTeamId.value || !startDate.value) return;
  const current = ++demandId;
  loading.value = true;
  errorMessage.value = '';
  try {
    // Trois périodes d'un coup (précédente, courante, suivante) pour que le glissement ait déjà ses données
    const first = Temporal.PlainDate.from(startDate.value).subtract({ days: span.value }).toString();
    const last = Temporal.PlainDate.from(startDate.value)
      .add({ days: 2 * span.value - 1 })
      .toString();
    const data = await teamStore.fetchTeamGrid(selectedTeamId.value, first, last);
    if (current === demandId) grid.value = data;
  } catch (error) {
    if (current === demandId) {
      grid.value = null;
      errorMessage.value = error.message || 'Erreur lors du chargement de la grille';
    }
  } finally {
    if (current === demandId) loading.value = false;
  }
};

watch(selectedTeamId, () => {
  grid.value = null; // ne pas afficher les membres de l'équipe précédente pendant le chargement
});

watch([selectedTeamId, startDate, span], loadGrid);

// Équipe de l'utilisateur aujourd'hui (null s'il n'en a pas : administrateur principal, par exemple)
const ownTeamId = async () => {
  if (!teamStore.currentTeam) await teamStore.fetchCurrentTeamOfUser(authStore.userData.userId);
  return teamStore.currentTeam?.teamId ?? null;
};

// Le jour courant change à minuit (fuseau du centre) si la grille reste ouverte
let timer = null;
onMounted(async () => {
  await Promise.all([teamStore.fetchCenterTeams(props.centerId), centerStore.fetchCenters()]);
  if (!team.value) {
    const own = await ownTeamId();
    selectedTeamId.value = teams.value.some((t) => t._id === own) ? own : (teams.value[0]?._id ?? null);
  }
  goToToday();
  timer = setInterval(() => {
    today.value = Temporal.Now.plainDateISO(timeZone.value).toString();
  }, 60000);
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
