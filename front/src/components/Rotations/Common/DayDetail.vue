<template>
  <v-card color="surfaceContainerHigh">
    <v-card-item>
      <v-card-title class="d-flex justify-space-between align-center">
        <div class="d-flex align-center ga-2">
          <div class="text-h6 font-weight-medium">
            {{ day?.name }}
          </div>


          <v-chip v-if="day.optional" color="surfaceContainerHighest" size="x-small" variant="flat" rounded="lg" flat>
            <div class="d-flex align-center ga-2">
              <span class="text-caption text-onSurface">Option</span>
              <v-icon size="small" icon="mdi-plus-box-outline" class="text-onSurface"></v-icon>
            </div>

          </v-chip>

        </div>
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

        <template v-if="day?.variations?.length === 0">

          <div class="d-flex justify-space-between align-center">
            <div>
              <div class="text-caption text-medium-emphasis">Début</div>
              <div class="text-h6">{{ day?.default?.startTime || '--:--' }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Fin</div>
              <div class="d-flex align-center">
                <div class="text-h6">{{ day?.default?.endTime || '--:--' }}</div>
                <span v-if="day?.default?.endsNextDay" class="ml-1"
                  style="font-size: 10px; opacity: 0.8; top: -2px; position: relative;">+1</span>
              </div>
            </div>
          </div>
        </template>
        <template v-else>


          <v-chip-group v-model="selectedVariant" color="background" base-color="surfaceContainerHighest"
            variant="tonal" class="">

            <v-chip v-for="(variant, index) in day?.variations" :key="index" :value="index" color="onBackground"
              variant="flat" rounded="lg">
              {{ day?.name }} {{ variant.name }}
            </v-chip>

          </v-chip-group>

          <div class="text-caption text-medium-emphasis" style="height: 40px">
            <v-slide-y-transition>
              <div v-show="!selectedVariant && selectedVariant !== 0"
                class="text-caption text-error text-medium-emphasis">Veuillez
                sélectionner une vacation élémentaire</div>
            </v-slide-y-transition>

          </div>


          <div class="d-flex justify-space-between align-center">
            <div>
              <div class="text-caption text-medium-emphasis">Début</div>

              <div class="text-h6" :key="selectedVariant">{{ !selectedVariant && selectedVariant !== 0 ?
                (day?.default?.startTime ||
                  '--:--') :
                (day?.variations[selectedVariant]?.startTime || '--:--') }}</div>

            </div>
            <div>

              <div class="text-caption text-medium-emphasis">Fin</div>
              <div class="d-flex align-center">
                <div class="text-h6" :key="selectedVariant">{{ selectedVariant === undefined ? (day?.default?.endTime ||
                  '--:--')
                  :
                  (day?.variations[selectedVariant]?.endTime || '--:--') }}</div>

                <span v-if="(selectedVariant === undefined) && day?.default?.endsNextDay" class="ml-1"
                  style=" font-size: 10px; opacity: 0.8; top: -2px; position: relative;">+1</span>
                <span v-if="(selectedVariant !== undefined && day?.variations[selectedVariant]?.endsNextDay)"
                  class="ml-1" style="font-size: 10px; opacity: 0.8; top: -2px; position: relative;">+1</span>
              </div>
            </div>
          </div>
          <div class="text-caption text-medium-emphasis" style="height: 40px">

            <v-fade-transition>
              <div v-show="!selectedVariant && selectedVariant !== 0"
                class="text-caption font-weight-bold text-medium-emphasis">Amplitude maximale</div>
            </v-fade-transition>
          </div>
        </template>
      </template>
      <!-- <div class="d-flex justify-start align-center">
        <div class="text-caption text-medium-emphasis">Nombre de points par défaut</div>
        <div class="text-caption font-weight-bold ml-2">{{ !selectedVariant && selectedVariant !== 0 ? day?.defaultPoints :
          variations(day)[selectedVariant]?.defaultPoints }}</div>

      </div> -->


    </v-card-text>

    <v-card-actions class="pa-6">
      <v-spacer></v-spacer>
      <v-btn v-if="deletable" color="error" variant="text" rounded="lg" prepend-icon="mdi-delete" size="small" slim
        @click="$emit('onDelete')">
        Supprimer
      </v-btn>
      <v-btn size="small" slim v-if="authStore.isAdmin && day?.type !== 'rest'" prepend-icon="mdi-pencil" variant="text"
        class="mr-2" @click="$emit('onEdit')">Modifier</v-btn>
    </v-card-actions>
  </v-card>

</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/authStore';

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


const emit = defineEmits(['onDelete', 'close', 'onEdit']);
const selectedVariant = ref(undefined);

const authStore = useAuthStore();

</script>

<style scoped>
.shift-item {
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline));
}
</style>