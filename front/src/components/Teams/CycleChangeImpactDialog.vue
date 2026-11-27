<template>
  <ImpactDialog
    v-model="modelValue"
    title="Confirmer le changement de position"
    confirm-label="Forcer le changement"
    :loading="loading"
    @confirm="emit('confirm')"
  >
    <template #alert>
      <p>{{ impact?.message }}</p>
      <p class="text-body-small mt-1">
        Les personnes concernées sont prévenues par e-mail. Les congés et autres entrées sans vacation sont conservés.
      </p>
    </template>

    <!-- Un panneau par membre (repliés : la liste reste courte), son en-tête dit ce qu'il contient -->
    <v-expansion-panels v-model="openedMembers" multiple variant="accordion" rounded="xl" elevation="0">
      <v-expansion-panel
        v-for="member in members"
        :key="member.userId"
        :value="member.userId"
        bg-color="surfaceContainer"
      >
        <v-expansion-panel-title>
          <div class="d-flex align-center flex-wrap ga-2 min-width-0 flex-grow-1 mr-2">
            <span class="text-body-large font-weight-medium flex-grow-1">{{ member.name }}</span>
            <v-chip v-for="count in countsOf(member)" :key="count.icon" size="small" rounded="lg" variant="tonal">
              <v-icon :icon="count.icon" start aria-hidden="true" />
              {{ count.value }}<span class="d-sr-only">&nbsp;{{ count.label }}</span>
            </v-chip>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <ImpactPreview :demands="member.demands" :entries="member.entries" />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </ImpactDialog>
</template>

<script setup>
import ImpactDialog from '@/components/Impact/ImpactDialog.vue';
import ImpactPreview from '@/components/Impact/ImpactPreview.vue';
import { impactCounts as countsOf } from '@/utils/impactLabels.js';

const props = defineProps({
  /** Réponse 409 de PUT /team/:id/cycle-position : { message, teams, members: [{ userId, name, demands, entries }] } */
  impact: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const modelValue = defineModel({ type: Boolean, default: false });
const emit = defineEmits(['confirm']);

const members = computed(() => props.impact?.members ?? []);

// Un seul membre : son détail est montré d'emblée
const openedMembers = ref([]);
watch(
  members,
  (list) => {
    openedMembers.value = list.length === 1 ? [list[0].userId] : [];
  },
  { immediate: true },
);
</script>
