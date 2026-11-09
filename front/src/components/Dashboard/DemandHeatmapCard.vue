<template>
  <v-card rounded="xl" elevation="0" class="pa-4" color="surfaceContainer">
    <div class="d-flex align-start justify-space-between ga-2 mb-3">
      <div class="d-flex flex-column">
        <span class="text-body-small text-uppercase text-disabled">
          Charge des demandes
        </span>
        <span class="text-title-medium font-weight-medium">{{ MONTHS }} prochains mois</span>
      </div>
      <v-progress-circular v-if="loading" indeterminate size="18" width="2" color="primary" />
    </div>

    <!-- Calendrier sur 6 mois, regroupé par mois (prop group-by) ; défile horizontalement dans la carte -->
    <div class="hm-scroll">
      <VHeatmap
        :items="items"
        :rows="WEEKDAYS.map((d) => d.key)"
        group-by="month"
        :group-gap="10"
        :thresholds="THRESHOLDS"
        :cell-size="26"
        :gap="3"
        rounded="7"
        hover
        :item-props="cellProps"
        empty-color="transparent"
      >
        <template #row-header="{ index }">
          <span class="text-label-small">{{ WEEKDAYS[index]?.label }}</span>
        </template>
        <template #group-header="{ group }">
          <span class="text-label-small text-capitalize">{{ monthLabel(group.key) }}</span>
        </template>
        <template #cell="{ item }">
          <div class="hm-cell" :class="`hm-tone-${item.raw.tone}`">
            <!-- Nombre total de demandes du jour (ouvertes + acceptées) ; rien les jours sans demande -->
            {{ item.raw.total || '' }}
          </div>
        </template>
      </VHeatmap>
    </div>

    <!-- Légende : la teinte dit ce qui domine, l'intensité dit la charge -->
    <div class="d-flex flex-wrap align-center ga-4 mt-3 text-body-small text-medium-emphasis">
      <span class="d-flex align-center ga-1">
        <span class="hm-swatch hm-swatch--primary" /> Demandes ouvertes
      </span>
      <span class="d-flex align-center ga-1">
        <span class="hm-swatch hm-swatch--secondary" /> Seulement acceptées
      </span>
    </div>

    <div v-if="summary" class="text-body-small text-medium-emphasis mt-2">
      {{ summary.open }} ouverte{{ summary.open > 1 ? 's' : '' }} · {{ summary.accepted }} acceptée{{ summary.accepted > 1 ? 's' : '' }}
    
    </div>
  </v-card>
</template>

<script setup>
import { Temporal } from '@js-temporal/polyfill';
import { VHeatmap } from 'vuetify/labs/VHeatmap';
import { useAuthStore } from '@/stores/authStore';
import { useCenterStore } from '@/stores/centerStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';

const DEFAULT_TIME_ZONE = 'Europe/Paris';
const MONTHS = 6;
const WEEKDAYS = [
  { key: 'lun', label: 'L' }, { key: 'mar', label: 'M' }, { key: 'mer', label: 'M' }, { key: 'jeu', label: 'J' },
  { key: 'ven', label: 'V' }, { key: 'sam', label: 'S' }, { key: 'dim', label: 'D' },
];

/*
 * Deux teintes, quatre intensités chacune. La valeur d'une cellule encode les deux :
 *   0 .......... aucune demande
 *   1..4 ....... seulement des demandes acceptées (secondaire), de plus en plus nombreuses
 *   11..14 ..... au moins une demande ouverte (primaire), de plus en plus nombreuses (ouvertes + acceptées)
 */
// Teinte du thème à `percent` % d'opacité. Pas de `rgba(var(--v-theme-x), a)` ici : les couleurs primary et secondary
// du thème sont déclarées en #rrggbbaa (alpha « ff »), donc Vuetify génère `--v-theme-primary: r,g,b,1` (4 valeurs)
// et `rgba(r,g,b,1, a)` est invalide ; `rgb(var(...))` accepte les 4 valeurs et color-mix applique l'opacité.
const tint = (name, percent) => `color-mix(in srgb, rgb(var(--v-theme-${name})) ${percent}%, transparent)`;
const THRESHOLDS = [
  { min: 0, color: tint('onSurface', 6) },
  { min: 1, color: tint('secondary', 30) },
  { min: 2, color: tint('secondary', 50) },
  { min: 3, color: tint('secondary', 75) },
  { min: 4, color: tint('secondary', 100) },
  { min: 11, color: tint('primary', 30) },
  { min: 12, color: tint('primary', 50) },
  { min: 13, color: tint('primary', 75) },
  { min: 14, color: tint('primary', 100) },
];

const authStore = useAuthStore();
const centerStore = useCenterStore();
const substitutionStore = useSubstitutionStore();

const centerId = computed(() => authStore.userData.centerId);
const timeZone = computed(() => centerStore.centers.find((c) => c._id === centerId.value)?.timeZone || DEFAULT_TIME_ZONE);
const todayKey = computed(() => Temporal.Now.plainDateISO(timeZone.value).toString());

// Période : du premier jour du mois en cours au dernier jour du 6e mois
const first = computed(() => Temporal.PlainDate.from(todayKey.value).with({ day: 1 }));
const last = computed(() => {
  const end = first.value.add({ months: MONTHS - 1 });
  return end.with({ day: end.daysInMonth });
});

const loading = ref(false);
const days = ref([]);   // [{ date, open, accepted }]

/** Intensité 1..4 d'après le nombre de demandes du jour */
const level = (count) => Math.min(Math.max(count, 1), 4);

const items = computed(() => {
  const byDate = new Map(days.value.map((d) => [d.date, d]));
  const total = first.value.until(last.value, { largestUnit: 'days' }).days + 1;

  return Array.from({ length: total }, (_, index) => {
    const date = first.value.add({ days: index });
    const { open = 0, accepted = 0 } = byDate.get(date.toString()) ?? {};
    const count = open + accepted;

    // value : voir THRESHOLDS ; tone : classe de couleur du numéro (primary-1..4 / secondary-1..4)
    const value = count === 0 ? 0 : open > 0 ? 10 + level(count) : level(count);
    const tone = count === 0 ? '0' : `${open > 0 ? 'p' : 's'}${level(count)}`;

    // Calendrier : une ligne par jour de la semaine, une colonne par semaine ; le mois sert de groupe
    const monday = date.subtract({ days: date.dayOfWeek - 1 });
    return {
      row: WEEKDAYS[date.dayOfWeek - 1].key,
      column: monday.toString(),
      month: date.toString().slice(0, 7),
      value,
      tone,
      total: count,
      date: date.toString(),
      open,
      accepted,
    };
  });
});

const monthLabel = (key) => Temporal.PlainDate.from(`${key}-01`).toLocaleString('fr-FR', { month: 'long', year: key.endsWith('-01') || key === first.value.toString().slice(0, 7) ? 'numeric' : undefined });

const cellProps = (cell) => {
  const { date, open, accepted } = cell.raw;
  const label = Temporal.PlainDate.from(date).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return {
    title: `${label} : ${open} ouverte${open > 1 ? 's' : ''}, ${accepted} acceptée${accepted > 1 ? 's' : ''}`,
    class: date === todayKey.value ? 'hm-today' : undefined,
  };
};

const summary = computed(() => {
  if (!days.value.length) return null;
  const open = days.value.reduce((total, d) => total + d.open, 0);
  const accepted = days.value.reduce((total, d) => total + d.accepted, 0);
  const peakDay = days.value.reduce((best, d) => (d.open + d.accepted > best.open + best.accepted ? d : best), days.value[0]);
  return {
    open,
    accepted,
    peak: peakDay.open + peakDay.accepted > 0
      ? { ...peakDay, label: Temporal.PlainDate.from(peakDay.date).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) }
      : null,
  };
});

let requestId = 0;
const load = async () => {
  if (!centerId.value) return;
  const current = ++requestId;
  loading.value = true;
  try {
    const data = await substitutionStore.fetchDemandHeatmap(centerId.value, {
      startDate: first.value.toString(),
      endDate: last.value.toString(),
    });
    if (current === requestId) days.value = data;
  } catch (error) {
    console.error('Erreur lors du chargement de la charge des demandes:', error);
    if (current === requestId) days.value = [];
  } finally {
    if (current === requestId) loading.value = false;
  }
};

// Les demandes changent (création, acceptation, annulation) : recompter, sans enchaîner les appels
let timer = null;
watch(() => substitutionStore.substitutions, () => {
  clearTimeout(timer);
  timer = setTimeout(load, 600);
}, { deep: false });

onMounted(async () => {
  if (!centerStore.centers.length) await centerStore.fetchCenters().catch(() => {});   // fuseau du centre
  load();
});

onBeforeUnmount(() => clearTimeout(timer));
</script>

<style scoped>
/* Pas d'en-têtes de colonnes (une date de lundi par semaine) : les mois, eux, restent affichés par les étiquettes de groupe.
   `hide-column-headers` les masquerait aussi, car VHeatmap range les deux dans la même option. */
:deep(.v-heatmap__column-headers) { display: none; }

/* Le calendrier est plus large que la carte : il défile horizontalement */
.hm-scroll { overflow-x: auto; }

.hm-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 10px;
  font-weight: 700;
}

/* Le nombre de demandes reste lisible sur chaque teinte (les teintes claires sont semi-transparentes sur la carte) */
.hm-tone-0,
.hm-tone-s1, .hm-tone-s2,
.hm-tone-p1, .hm-tone-p2 { color: rgb(var(--v-theme-onSurface)); }
.hm-tone-s3, .hm-tone-s4 { color: rgb(var(--v-theme-onSecondary)); }
.hm-tone-p3, .hm-tone-p4 { color: rgb(var(--v-theme-onPrimary)); }

.hm-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 4px;
}
.hm-swatch--primary { background: rgb(var(--v-theme-primary)); }
.hm-swatch--secondary { background: rgb(var(--v-theme-secondary)); }

/* Aujourd'hui */
:deep(.hm-today .v-heatmap__cell-rect) {
  stroke: rgb(var(--v-theme-onSurface));
  stroke-width: 2px;
}
</style>
