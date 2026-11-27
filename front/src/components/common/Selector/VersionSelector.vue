<template>
  <!-- Carte de sélection -->

  <v-card
    elevation="0"
    class="mt-2 pa-6 d-flex align-center justify-space-between cursor-pointer"
    color="surfaceContainer"
    @click="hasData ? openDialog() : null"
  >
    <div class="d-flex flex-column pl-4">
      <div v-if="!hasData" class="d-flex ga-2 align-center">
        <span class="text-title-large font-weight-bold">Aucune donnée disponible</span>
      </div>
      <div v-else class="d-flex ga-2 align-center">
        <span class="text-title-large font-weight-bold">{{ title || defaultText }}</span>
        <slot name="statusChip" />
      </div>

      <div v-if="!hasData" class="d-flex ga-2 align-center">
        <span class="text-body-small text-medium-emphasis">Erreur du serveur</span>
      </div>
      <div v-else class="d-flex ga-2 align-center">
        <span class="text-body-small text-medium-emphasis">{{ subtitle || '' }}</span>
      </div>
    </div>
    <v-icon v-if="hasData" icon="mdi-chevron-right" size="32" color="primary" />
    <v-icon v-else icon="mdi-alert-circle" size="32" color="error" />
  </v-card>

  <!-- Dialog -->
  <v-dialog v-model="open" :width="dialogWidth">
    <slot name="dialog" :close="close">
      <!-- Par défaut, rien -->
    </slot>
  </v-dialog>
</template>

<script setup>
/** Ouverture de la fenêtre de choix */
const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  /** L'élément choisi : quand il change, la fenêtre se ferme */
  selection: {
    type: Object,
    default: null,
  },
  hasData: {
    type: Boolean,
    default: true,
  },
  width: {
    type: [String, Number],
    default: 400,
  },
  defaultText: {
    type: String,
    default: 'Sélectionner une version',
  },
  title: {
    type: String,
    default: 'Sélectionner une version',
  },
  subtitle: {
    type: String,
    default: '',
  },
});
const emit = defineEmits(['open', 'close']);

const dialogWidth = props.width;

const close = () => {
  open.value = false;
};

watch(() => props.selection, close);
watch(open, (isOpen) => {
  if (isOpen) emit('open');
  else emit('close');
});

function openDialog() {
  open.value = true;
}
</script>
