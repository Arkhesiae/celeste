<template>
  <v-card  color="surfaceContainerHigh">
    <v-card-item>
      <v-card-title class="d-flex justify-space-between align-center">
        <div class="text-h6 font-weight-medium">
          {{ day?.name }}
        </div>
        <v-btn
            v-if="day?.type !== 'rest'"
            icon="mdi-pencil"
            variant="text"
            class="mr-2"
            @click="showEditDialog = true"
          ></v-btn>
        <v-btn v-if="!isMobile" icon="mdi-close" variant="text" @click="$emit('close')"></v-btn>
      </v-card-title>
      <v-card-subtitle class="text-medium-emphasis">
        {{ day?.type === 'rest' ? 'Jour de repos' : 'Jour de travail' }}
      </v-card-subtitle>
    </v-card-item>

    <v-card-text class="">
      <template v-if="day?.type === 'rest'">
      </template>
      <template v-else>
        <template v-if="day?.variants?.length === 0">
          <div class="text-body-1 mb-4">Horaires de travail</div>
          <div class="d-flex justify-space-between align-center">
            <div>
              <div class="text-caption text-medium-emphasis">Début</div>
              <div class="text-h6">{{ day?.startTime || '--:--' }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Fin</div>
              <div class="text-h6">{{ day?.endTime || '--:--' }}</div>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="text-body-1 mb-4">Horaires de travail</div>
          <v-chip-group
            v-model="selectedVariant"
          
            color="background"
            variant="flat"
            class="mb-4"
          >
            <v-chip
              value="default"
              color="onBackground"
              rounded="lg"
               variant="flat"
            >
              Défaut
            </v-chip>
            <v-chip
              v-for="(variant, index) in day?.variants"
              :key="index"
              :value="index"
                color="onBackground"
               variant="flat"
              rounded="lg"
            >
              {{ day?.name }} {{ variant.name }}
            </v-chip>
          </v-chip-group>
          <div class="d-flex justify-space-between align-center">
            <div>
              <div class="text-caption text-medium-emphasis">Début</div>
              <div class="text-h6">{{ selectedVariant === 'default' ? (day?.startTime || '--:--') : (day?.variants[selectedVariant]?.startTime || '--:--') }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Fin</div>
              <div class="text-h6">{{ selectedVariant === 'default' ? (day?.endTime || '--:--') : (day?.variants[selectedVariant]?.endTime || '--:--') }}</div>
            </div>
          </div>
        </template>
      </template>
    </v-card-text>

    <v-card-actions class="pa-6">
      <v-spacer></v-spacer>
      <v-btn
        v-if="deletable"
        color="error"
        variant="tonal"
        rounded="lg"
        prepend-icon="mdi-delete"
        @click="$emit('onDelete')"
      >
        Supprimer
      </v-btn>
    </v-card-actions>
  </v-card>
  
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  day: {
    type: Object,
    required: true
  },
  isMobile: {
    type: Boolean,
    default: false
  },
    deletable: {
      type: Boolean,
      default: true
    }
});

const emit = defineEmits(['onDelete', 'close']);
const selectedVariant = ref('default');
</script>

<style scoped>
.shift-item {
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline));
}
</style> 