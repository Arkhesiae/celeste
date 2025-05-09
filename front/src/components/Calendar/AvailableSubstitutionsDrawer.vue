<template>
  <v-navigation-drawer
    location="right"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    temporary
    width="600"
    floating
    style="z-index: 1000333 !important"
    order="-7"
  >
    <v-sheet class="pa-4">
      <v-card-item class="py-1 px-6 mb-2">
       
       <v-card-title class="d-flex justify-space-between align-center">Remplacements disponibles</v-card-title>
       <template #append v-if="!smAndDown">
         <v-btn icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)"></v-btn>
       </template>
       <template #prepend v-else>
         <v-btn icon="mdi-arrow-left" variant="text" @click="$emit('update:modelValue', false)"></v-btn>
       </template>
     </v-card-item>

    

 
        <DemandCard
          v-for="substitution in availableSubstitutions"
          :key="substitution.id"
          :demand="substitution"
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
  }
});

const emit = defineEmits(['update:modelValue']);

const substitutionStore = useSubstitutionStore();
const availableSubstitutions  = computed(() => substitutionStore.availableSubstitutions.filter(substitution => substitution.posterShift.date === props.selectedDate));



const handleAccept = async (substitution) => {
  try {
    await substitutionStore.acceptSubstitution(substitution.id);
    emit('update:modelValue', false);
  } catch (error) {
    console.error('Erreur lors de l\'acceptation de la substitution:', error);
  }
};
</script>

<style scoped>

</style> 