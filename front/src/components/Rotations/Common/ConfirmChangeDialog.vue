<template>
  <GenericDialog
    v-model="modelValue"
    :title="`Confirmation de changement · ${changeIndex + 1} / ${totalChangesCount}`"
    max-width="900px"
    @update:model-value="handleDialogClose"
  >
    <template #content>
      <span class="text-body-small"
        >Les changements suivants seront appliqués au tour de service. En conséquence, les vacations pendant cette
        période seront converties de la façon suivante :</span
      >

      <v-alert v-if="pendingActivation.changes?.length > 1" type="info" class="my-3" density="compact">
        <v-progress-linear :model-value="(changeIndex / totalChangesCount) * 100" color="primary" height="8" rounded />
        <div class="d-flex justify-space-between mt-2">
          <span class="text-body-small">Approuvé: {{ changeIndex }} / {{ totalChangesCount }}</span>
          <span class="text-body-small">Restants: {{ totalChangesCount - changeIndex }}</span>
        </div>
      </v-alert>

      <template v-if="currentChange">
        <v-card class="pa-4 my-8" elevation="0" color="surfaceContainer">
          <div class="d-flex align-center ga-1">
            <span v-if="currentChange.to" class="text-body-small">Du </span>
            <span v-else class="text-body-small">À partir du </span>
            <v-chip color="primary" variant="tonal" size="x-small" rounded="xl">
              {{ formatDate(currentChange.from) }}
            </v-chip>

            <span v-if="currentChange.to" class="text-body-small">au </span>
            <v-chip v-if="currentChange.to" color="primary" variant="tonal" size="x-small" rounded="xl">
              {{ formatDate(currentChange.to) }}
            </v-chip>
          </div>

          <v-divider class="my-2" />
          <v-row>
            <v-col cols="12">
              <div class="d-flex align-center justify-center ga-1">
                <v-chip color="onBackground" variant="tonal" size="x-small" rounded="xl">
                  {{ rotationName(currentChange.oldRule) }}
                </v-chip>
                <v-icon icon="mdi-arrow-right" size="x-small" color="primary" />
                <v-chip color="onBackground" variant="tonal" size="x-small" rounded="xl">
                  {{ rotationName(currentChange.newRule) }}
                </v-chip>
              </div>
            </v-col>

            <v-col cols="12">
              <!-- Un jour par colonne : le jour de l'ancien tour (en haut) devient celui du nouveau (en bas) ; le tour le plus court se répète -->
              <div
                class="change-rows"
                role="group"
                aria-label="Correspondance des jours entre l'ancien et le nouveau tour de service"
              >
                <div v-for="row in changeRows(currentChange)" :key="row.key" class="change-row">
                  <span class="change-row__label text-label-small">{{ row.label }}</span>
                  <div class="change-row__tiles">
                    <div
                      v-for="slot in row.slots"
                      :key="slot.key"
                      class="tile tile--static change-tile"
                      :class="[slot.kindClass, { 'tile--muted': !slot.inCycle }]"
                      :title="slot.title"
                    >
                      <span class="change-tile__name text-label-medium font-weight-bold">{{ slot.name || '—' }}</span>
                      <span class="change-tile__hours text-label-small">{{ slot.hours }}</span>
                      <!-- Variantes de la vacation (leurs horaires dans l'infobulle de la tuile) -->
                      <v-chip
                        v-if="slot.variations"
                        size="x-small"
                        rounded="lg"
                        variant="tonal"
                        class="change-tile__variations"
                        prepend-icon="mdi-source-branch"
                      >
                        {{ slot.variations }}
                      </v-chip>
                    </div>
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
          <v-chip
            v-if="differentLength(currentChange)"
            color="error"
            variant="tonal"
            class=""
            size="x-small"
            rounded="xl"
          >
            Nombre de jours différent
          </v-chip>

          <div
            v-if="differentLength(currentChange)"
            class="d-flex align-center justify-center ga-2 my-2"
            style="font-size: 11px !important"
          >
            Lorsqu'un tour de service ne comporte pas le même nombre de jours que le précédent, les demandes de
            remplacement et permutations pendant la période concernée seront pas converties et seront annulées. De plus,
            il est possible que les équipes n'apparaissent pas avec les bonnes vacations. Ce cas de figure très rare est
            déconseillé, doit être évité si possible.
          </div>
          <div v-else class="d-flex align-center justify-center ga-2 my-2" style="font-size: 11px !important">
            Les demandes de remplacement et permutations dans la période concernée seront également converties en
            conséquence selon le schéma ci-dessus
          </div>

          <div class="d-flex align-center justify-center ga-2 my-2" style="font-size: 11px !important">
            <v-chip
              v-if="currentChange.demandsToConvert?.length === 0"
              color="surfaceContainerHigh"
              variant="flat"
              rounded="xl"
            >
              <div class="d-flex align-center ga-1 font-weight-bold">
                <v-icon icon="mdi-swap-horizontal" size="small" color="onBackground" />
                <span class="text-body-small font-weight-bold text-onBackground">Aucune demande concernée</span>
              </div>
            </v-chip>
          </div>
        </v-card>
      </template>

      <v-card
        v-if="currentChange?.demandsToConvert?.length > 0"
        class="pa-4 my-4"
        flat
        elevation="0"
        rounded="20"
        color="primary"
      >
        <div class="d-flex align-center ga-1 font-weight-bold">
          <v-icon :icon="differentLength(currentChange) ? 'mdi-alert-outline' : 'mdi-swap-horizontal'" size="small" />
          <span class="text-body-small font-weight-bold"
            >{{ currentChange.demandsToConvert.length }} demandes de remplacement et permutations seront
            {{ differentLength(currentChange) ? 'annulées' : 'converties' }}</span
          >
        </div>
      </v-card>

      <div
        class="d-flex align-center justify-center rounded-xl pa-4"
        style="font-size: 12px !important; background-color: rgba(var(--v-theme-primary), 0.1)"
      >
        <span class="text-primary">
          Des erreurs de compatibilités peuvent parfois apparaitre si les demandes ne sont pas compatibles avec le
          nouveau tour de service au regard de l'arrêté 2024, il est donc conseillé de vérifier les demandes après la
          confirmation</span
        >
      </div>
    </template>

    <template #footer>
      <v-btn color="secondary" variant="outlined" @click="handleCancel">Annuler</v-btn>
      <v-spacer />
      <v-btn v-if="changeIndex > 0" color="secondary" variant="text" @click="handlePreviousChange">
        <v-icon start>mdi-chevron-left</v-icon>
        Précédent
      </v-btn>
      <v-btn v-if="changeIndex < totalChangesCount - 1" :disabled="!currentChange" @click="approveChange"
        >Accepter</v-btn
      >
      <v-btn v-if="changeIndex === totalChangesCount - 1" variant="tonal" @click="handleConfirm">
        <v-icon start>mdi-check</v-icon>
        Confirmer tous les changements
      </v-btn>
    </template>
  </GenericDialog>
</template>

<script setup>
import formatDate from '@/utils/formatDate';
import { useRotationStore } from '@/stores/rotationStore';
import { dayKindClass, dayKindOf } from '@/utils/dayStyle';

const rotationStore = useRotationStore();

const emit = defineEmits(['confirm', 'cancel']);

const props = defineProps({
  pendingActivation: {
    type: Object,
    required: true,
  },
});

const changeIndex = ref(0);

const modelValue = defineModel({ type: Boolean, default: false });

// Computed properties
const totalChangesCount = computed(() => props.pendingActivation?.changes?.length || 0);

const currentChange = computed(() => {
  if (!props.pendingActivation?.changes || props.pendingActivation.changes.length === 0) {
    return null;
  }
  return props.pendingActivation.changes[changeIndex.value];
});

const rotationName = (rotationId) => {
  const rotation = rotationStore.findRotationById(rotationId);
  return rotation?.name || '';
};

const rotationDays = (rotationId) => {
  const rotation = rotationStore.findRotationById(rotationId);
  return rotation?.days || [];
};

const differentLength = (change) => {
  return rotationDays(change.oldRule).length !== rotationDays(change.newRule).length;
};

const maxRotationDays = (change) => {
  return Math.max(rotationDays(change.oldRule).length, rotationDays(change.newRule).length);
};

// Une tuile par jour du tour : nom, horaires par défaut et nature (travail / repos, mêmes couleurs que le calendrier). Au-delà de la
// longueur de l'ancien tour il n'y a plus de jour (tuile vide) ; le nouveau, plus court, se répète en tuiles atténuées.
const slotsOf = (rotationId, count, repeat) => {
  const days = rotationDays(rotationId);
  return Array.from({ length: count }, (_, index) => {
    const inCycle = index < days.length;
    const day = days.length && (inCycle || repeat) ? days[index % days.length] : null;
    const { startTime, endTime } = day?.default ?? {};
    return {
      key: index,
      name: day?.name ?? '',
      hours: startTime && endTime ? `${startTime}–${endTime}` : '',
      variations: (day?.variations ?? []).map((variation) => variation.name).join(' · '),
      title: [
        day?.name,
        startTime && endTime ? `${startTime}–${endTime}` : '',
        ...(day?.variations ?? []).map((variation) => `${variation.name} ${variation.startTime}–${variation.endTime}`),
      ]
        .filter(Boolean)
        .join('\n'),
      kindClass: dayKindClass(dayKindOf({ shiftType: day?.type })),
      inCycle,
    };
  });
};

const changeRows = (change) => {
  const count = maxRotationDays(change);
  return [
    { key: 'old', label: `Avant : ${rotationName(change.oldRule)}`, slots: slotsOf(change.oldRule, count, false) },
    { key: 'new', label: `Après : ${rotationName(change.newRule)}`, slots: slotsOf(change.newRule, count, true) },
  ];
};

const approveChange = () => {
  changeIndex.value++;
};

const handleCancel = () => {
  changeIndex.value = 0;
  emit('cancel');
  modelValue.value = false;
};

const handleConfirm = () => {
  console.log('handleConfirm', changeIndex.value, totalChangesCount.value);
  if (changeIndex.value === totalChangesCount.value - 1) {
    emit('confirm');
    modelValue.value = false;
  }
};

const handlePreviousChange = () => {
  if (changeIndex.value > 0) {
    changeIndex.value--;
  }
};

const handleDialogClose = (value) => {
  if (!value) {
    changeIndex.value = 0;
  }
};

watch(
  () => props.pendingActivation?.changes,
  (changes) => {
    changeIndex.value = 0;
  },
  { immediate: true },
);

watch(modelValue, (visible) => {
  if (visible) {
    changeIndex.value = 0;
  }
});
</script>

<style scoped>
/* Deux rangées qui défilent ensemble si le tour a beaucoup de jours : colonnes de largeur fixe, donc alignées d'une rangée à l'autre */
.change-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.change-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: max-content;
  min-width: 100%;
}

.change-row__label {
  opacity: 0.7;
  position: sticky;
  left: 0;
}

.change-row__tiles {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 80px;
  gap: 4px;
}

.change-tile {
  --tile-radius: 12px;
  min-height: 0;
  gap: 2px;
  padding: 6px 8px;
}

.change-tile__name,
.change-tile__hours {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.change-tile__variations {
  max-width: 100%;
  justify-content: flex-start;
}

.change-tile__variations :deep(.v-chip__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.change-tile__hours {
  opacity: 0.7;
  min-height: 1em;
}
</style>
