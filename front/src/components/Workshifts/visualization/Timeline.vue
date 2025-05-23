<template>
  <div >
    <v-card v-if="!currentActive" color="surfaceContainerHigh" variant="tonal" class="pa-2 mb-4" rounded="xl">
      <v-card-item>
        <template #prepend>
          <v-icon icon="mdi-alert-outline"></v-icon>
        </template>
        <v-card-title class="text-body-1">Aucun tour de service actif</v-card-title>
      </v-card-item>
      <v-card-text>
        <p class="text-medium-emphasis">
          Programmez l'activation d'un tour de service. Sans tour de service, vos utilisateurs ne peuvent pas
          publier et accepter des demandes.
        </p>
      </v-card-text>
    </v-card>
    <v-card v-if="sortedRotations?.length>0" rounded="xl" elevation="0" class="py-4" >
      <v-timeline line-inset="4px" line-color="surface-variant" truncate-line="end" side="end" line-thickness="2">
        <v-scroll-y-transition group appear>
          <v-timeline-item
            v-for="rotation in sortedRotations"
            :key="rotation._id"
            size="sm"
            :class="{ dashed: rotation.status === 'active', toBeActive: rotation.status === 'toBeActive', 'opacity-50': rotation.status === 'toBeActive' }"
            fill-dot
            :dot-color="rotation.status === 'active' ? 'primary' : 'rgba(17,24,41,0.78)'"
          >
            <div class="d-flex flex-column justify-start">
              <div class="d-flex align-center justify-start">
                <span class="text-overline font-weight-bold">{{ rotation.name }}</span>
                <v-chip v-if="rotation.status === 'Active'" class="ms-0" color="primary" size="small" rounded="pill" label>
                  Actif
                </v-chip>
              </div>
              <v-tooltip
                  location="top"
                  text="Supprimer la date d'activation"
                >
                  <template v-slot:activator="{ props }">
              <v-chip
                class="ms-0"
                color="tertiary"
                size="small"
                rounded="lg"
                label
                append-icon="mdi-close"
                @click="$emit('removeActivationDate', rotation._id, rotation.activationDate, rotation.centerId)"
              >
            
                    <span v-bind="props">
                      {{ new Date(rotation.activationDate).toLocaleDateString() || 'N/A' }}
                    </span>
                  
              </v-chip>
            </template>
          </v-tooltip>
            </div>
          </v-timeline-item>
        </v-scroll-y-transition>
      </v-timeline>
    </v-card>
  </div>
</template>

<script setup>
defineProps({
  currentActive: {
    type: [Object, null],
    required: true
  },
  sortedRotations: {
    type: [Array, null],
    required: true
  }
});

defineEmits(['removeActivationDate']);
</script>

<style scoped>
:deep(.dashed > .v-timeline-divider > .v-timeline-divider__after) {
  border: none;
  margin-bottom: 2px !important;
  border-left: 2px dotted rgba(40, 55, 67, 0.49);
  background: none !important;
}

:deep(.toBeActive > .v-timeline-divider > .v-timeline-divider__after) {
  border: none;
  margin-bottom: 2px !important;
  border-left: 2px dotted rgba(40, 55, 67, 0.49);
  background: none !important;
}

:deep(.toBeActive > .v-timeline-divider > .v-timeline-divider__before) {
  border: none;
  border-left: 2px dotted rgba(40, 55, 67, 0.49);
  background: none !important;
}
</style> 