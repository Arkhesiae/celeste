<template>
  <v-navigation-drawer
    location="right"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
 
    floating
    order="-5"
    temporary
    style="z-index: 2500;"
    width="600"
  >
    <v-sheet class="pa-4">
      <v-card-item class="py-1 px-6 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">
          {{ drawerTitle }}
        </v-card-title>
        <template #append v-if="!smAndDown">
          <v-btn icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)"></v-btn>
        </template>
        <template #prepend v-else>
          <v-btn icon="mdi-arrow-left" variant="text" @click="$emit('update:modelValue', false)"></v-btn>
        </template>
      </v-card-item>

  
      <DemandCard
        v-for="demand in filteredDemands"
        :key="demand.id"
        :demand="demand"
        :small="true"
      ></DemandCard>
    </v-sheet>
  </v-navigation-drawer>
</template>

<script setup>
import { computed } from 'vue';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import DemandCard from '@/components/Remplacer/DemandCard.vue';
import { useDisplay } from 'vuetify';

const { smAndDown } = useDisplay();

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  selectedDate: {
    type: [String, null],
    required: true
  },
  drawerType: {
    type: String,
    required: true,
    validator: (value) => ['substitutions', 'switches', 'others'].includes(value)
  }
});

const emit = defineEmits(['update:modelValue']);

const substitutionStore = useSubstitutionStore();

const drawerTitle = computed(() => {
  switch (props.drawerType) {
    case 'substitutions':
      return 'Remplacements disponibles';
    case 'switches':
      return 'Permutations disponibles';
    case 'others':
      return 'Remplacements disponibles';
    default:
      return '';
  }
});

const filteredDemands = computed(() => {
  const demands = {
    substitutions: substitutionStore.availableSubstitutions,
    switches: substitutionStore.availableSwitches,
    others: substitutionStore.otherDemands
  }[props.drawerType];

  return demands?.filter(demand => demand.posterShift.date === props.selectedDate);
});
</script>

<style scoped>

.v-dialog {
  z-index: 3000 !important;
}
</style> 