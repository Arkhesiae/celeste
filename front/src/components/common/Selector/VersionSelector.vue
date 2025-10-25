<template>

  <!-- Carte de sélection -->

  <v-card @click="hasData ? openDialog() : null" style="cursor:pointer;" rounded="xl" elevation="0"
    class="mt-2 smooth-shadow pa-6 d-flex align-center justify-space-between" color="surfaceContainer">
    <div class="d-flex flex-column pl-4">

      <div v-if="!hasData" class="d-flex ga-2 align-center">
        <span class="text-h6 font-weight-bold">Aucune donnée disponible</span>
      </div>
      <div v-else class="d-flex ga-2 align-center"> <span class="text-h6 font-weight-bold">{{ title || defaultText }}</span>
        <slot name="statusChip">
        </slot>
      </div>


      <div v-if="!hasData" class="d-flex ga-2 align-center">
        <span class="text-caption text-medium-emphasis">Erreur du serveur</span>
      </div>
      <div v-else class="d-flex ga-2 align-center">
        <span class="text-caption text-medium-emphasis">{{ subtitle || '' }}</span>
      </div>

    </div>
    <v-icon v-if="hasData" icon="mdi-chevron-right" size="32" color="remplacement" />
    <v-icon v-else icon="mdi-alert-circle" size="32" color="error" />

  </v-card>

  <!-- Dialog -->
  <v-dialog v-model="dialogOpen" :width="dialogWidth">
    <slot name="dialog">
      <!-- Par défaut, rien -->
    </slot>
  </v-dialog>

</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
  },
  hasData: {
    type: Boolean,
    default: true
  },
  width: {
    type: [String, Number],
    default: 400
  },
  defaultText: {
    type: String,
    default: 'Sélectionner une version'
  },
  title: {
    type: String,
    default: 'Sélectionner une version'
  },
  subtitle: {
    type: String,
    default: ''
  }
});
const emit = defineEmits(['update:modelValue', 'open', 'close']);

const dialogOpen = ref(false);
const dialogWidth = props.width;

// Support v-model
watch(() => props.modelValue, (val) => {
  dialogOpen.value = false;
});
watch(dialogOpen, (val) => {
  emit('update:modelValue', val);
  if (val) emit('open');
  else emit('close');
});

function openDialog() {
  dialogOpen.value = true;
}
</script>