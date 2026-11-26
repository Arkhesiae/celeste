<template>
  <div class="d-flex flex-column ga-4">
    <v-alert v-if="!currentActive" color="error" icon="mdi-alert-outline" rounded="xl">
      <div class="text-body-large font-weight-medium">Aucun tour de service actif</div>
      <div class="text-body-medium opacity-80">
        Programmez l'activation d'un tour de service. Sans tour de service, vos utilisateurs ne peuvent pas publier et
        accepter des demandes.
      </div>
    </v-alert>

    <ol v-if="periods.length" class="timeline">
      <li
        v-for="period in periods"
        :key="period.key"
        class="timeline__item"
        :class="`timeline__item--${period.status}`"
      >
        <!-- Repère : icône de l'état, reliée à la période suivante -->
        <div class="timeline__rail" aria-hidden="true">
          <span class="timeline__marker">
            <v-icon :icon="period.icon" size="20" />
          </span>
        </div>

        <div class="tile tile--static timeline__tile" :class="{ 'tile--muted': period.status === 'past' }">
          <div class="d-flex align-start justify-space-between ga-2 w-100">
            <div class="d-flex flex-column min-width-0">
              <span class="text-title-medium font-weight-medium text-truncate">{{ period.name }}</span>
              <span class="timeline__state text-label-medium">
                {{ period.label }}<template v-if="period.deleted"> · tour supprimé</template>
              </span>
            </div>
            <v-btn
              v-if="period.removable"
              class="flex-none"
              icon
              variant="text"
              size="small"
              :aria-label="`Supprimer l'activation du ${period.from}`"
              @click="emit('removeActivationDate', period.rotationId, period.activationDate, period.centerId)"
            >
              <v-icon icon="mdi-calendar-remove-outline" />
              <v-tooltip activator="parent" location="top" text="Supprimer la date d'activation" />
            </v-btn>
          </div>

          <div class="d-flex align-center flex-wrap ga-2 text-body-small">
            <v-icon icon="mdi-calendar-range-outline" size="16" />
            <span>{{ period.range }}</span>
          </div>
          <div class="d-flex align-center ga-2 text-body-small text-medium-emphasis">
            <v-icon icon="mdi-timer-sand" size="16" />
            <span>{{ period.duration }}</span>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup>
import { Temporal } from 'temporal-polyfill';
import { formatDay, activationDay } from '@/utils/dayFields.js';
import { useCenterStore } from '@/stores/centerStore.js';

const props = defineProps({
  currentActive: {
    type: [Object, null],
    required: true,
  },
  sortedRotations: {
    type: [Array, null],
    required: true,
  },
});

const emit = defineEmits(['removeActivationDate']);

const centerStore = useCenterStore();

const STATES = {
  active: { label: 'En cours', icon: 'mdi-play-circle-outline' },
  toBeActive: { label: 'À venir', icon: 'mdi-calendar-clock-outline' },
  past: { label: 'Terminé', icon: 'mdi-history' },
};

const SHORT_DATE = { day: 'numeric', month: 'short', year: 'numeric' };

const todayOf = (centerId) => {
  const timeZone = centerStore.centers.find((c) => c._id === centerId)?.timeZone || 'Europe/Paris';
  return Temporal.Now.plainDateISO(timeZone);
};

const daysBetween = (from, to) => Temporal.PlainDate.from(from).until(to, { largestUnit: 'days' }).days;
const dayCount = (count) => `${count} jour${count > 1 ? 's' : ''}`;

/** Une période par activation (les dates arrivent triées) : elle s'achève la veille de l'activation suivante */
const periods = computed(() => {
  const rotations = props.sortedRotations ?? [];
  return rotations.map((rotation, index) => {
    const start = activationDay(rotation);
    const next = rotations[index + 1] ? activationDay(rotations[index + 1]) : null;
    const end = next ? Temporal.PlainDate.from(next).subtract({ days: 1 }).toString() : null;
    const today = todayOf(rotation.centerId);
    const status = STATES[rotation.status] ? rotation.status : 'past';
    const from = formatDay(start, SHORT_DATE);

    let range = `À partir du ${from}`;
    if (end) range = end === start ? `Le ${from}` : `Du ${from} au ${formatDay(end, SHORT_DATE)}`;
    else if (status === 'active') range = `Depuis le ${from}`;

    let duration = 'Sans date de fin';
    if (status === 'toBeActive') duration = `Commence dans ${dayCount(daysBetween(today, start))}`;
    else if (status === 'active') duration = `${dayCount(daysBetween(start, today) + 1)} en cours`;
    else if (end) duration = `A duré ${dayCount(daysBetween(start, end) + 1)}`;

    return {
      key: `${rotation._id}-${start}`,
      rotationId: rotation._id,
      centerId: rotation.centerId,
      activationDate: rotation.activationDate,
      name: rotation.name,
      deleted: !!rotation.deleted,
      status,
      ...STATES[status],
      from,
      range,
      duration,
      // Une activation passée ne se supprime pas (le serveur le refuse) : « aujourd'hui » est le jour du centre
      removable: start >= today.toString(),
    };
  });
});
</script>

<style scoped>
.timeline {
  list-style: none;
  padding: 0;
  margin: 0;
}

.timeline__item {
  --period-accent: var(--v-theme-outline);
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  column-gap: 12px;
}

.timeline__item--active {
  --period-accent: var(--v-theme-primary);
}

.timeline__item--toBeActive {
  --period-accent: var(--v-theme-secondary);
}

.timeline__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeline__marker {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: rgb(var(--period-accent));
  background: rgba(var(--period-accent), 0.14);
}

.timeline__item--active .timeline__marker {
  color: rgb(var(--v-theme-onPrimary));
  background: rgb(var(--v-theme-primary));
}

/* Trait vers la période suivante ; en pointillés quand celle-ci est à venir ou en cours de préparation */
.timeline__item:not(:last-child) .timeline__rail::after {
  content: '';
  flex: 1;
  margin: 4px 0;
  border-left: 2px solid rgba(var(--v-theme-outlineVariant), 0.8);
}

.timeline__item--active:not(:last-child) .timeline__rail::after,
.timeline__item--toBeActive:not(:last-child) .timeline__rail::after {
  border-left-style: dashed;
}

.timeline__tile {
  gap: 6px;
  min-height: 0;
  padding: 12px;
  margin-bottom: 12px;
}

.timeline__item--active .timeline__tile {
  --tile-bg: rgba(var(--v-theme-primary), 0.14);
  --tile-border: rgb(var(--v-theme-primary));
}

.timeline__item--toBeActive .timeline__tile {
  --tile-bg: rgba(var(--v-theme-secondary), 0.08);
  border-style: dashed;
  --tile-border: rgba(var(--v-theme-secondary), 0.6);
}

.timeline__state {
  color: rgb(var(--period-accent));
}
</style>
