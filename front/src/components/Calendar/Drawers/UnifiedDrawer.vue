<template>
  <v-overlay :model-value="modelValue" @update:model-value="handleClose" :z-index="2449" :style="{zIndex: 2449 }" class="" />
  <v-slide-x-reverse-transition>
    <div v-if="modelValue" class="d-flex" style="
        position: fixed;
        top: 0;
        right: 0;
        width: 100%;
        max-width: 600px;
        height: 100vh;
        z-index: 2450 !important;
        background: white;
        
        overflow-y: auto;
      ">
      <v-sheet class="pa-0 w-100">
        <div ref="headerRef" :style="{
          paddingTop: 'calc(var(--safe-area-top,0px) + 8px) !important',
          paddingLeft: smAndDown ? '4px !important' : '24px !important',
        }" :class="[
          'pb-2 pr-2  d-flex align-center justify-space-between pa-0 ma-0 transition-all duration-300',
          isScrolled ? 'bg-surfaceContainerHigh' : ''
        ]">
          <div class="d-flex align-center justify-space-between flex-grow-1">
            <div class="d-flex align-center">
              <v-btn v-if="smAndDown" icon="mdi-arrow-left" variant="text" @click="handleClose" class="mr-1" />

              <span :class="{
                'text-h6': !smAndDown,
                'text-h7': smAndDown
              }" class=" font-weight-medium">
                {{ formattedDate }}
              </span>
            </div>


            <v-btn v-if="!smAndDown" icon="mdi-close" variant="text" @click="handleClose" />
          </div>

          <div v-if="smAndDown" class="d-flex align-center gap-2">
            <!-- Bouton de fermeture/retour adaptatif -->



            <!-- Boutons d'action supplémentaires -->
            <slot name="actions" />
          </div>
        </div>

        <v-row class="px-6">
          <v-col cols="12">
            <AvailableDemands :selected-date="selectedDate" @handle-replacement="handleReplacement" @handle-switch="handleSwitch" @open-details="openDemand"/>
          </v-col>
        </v-row>
        
      </v-sheet>
    </div>
  </v-slide-x-reverse-transition>
</template>

<script setup>
import formatDate from '@/utils/formatDate';
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
});

const emit = defineEmits(['update:modelValue', 'handle-replacement', 'handle-switch', 'open-details']);

const isScrolled = ref(false);

// Methods
const handleClose = () => {
  emit('update:modelValue', false)
}

const handleReplacement = (demand) => {
  emit('handle-replacement', demand)
}

const handleSwitch = (demand) => {
  emit('handle-switch', demand)
}

const openDemand = (demand) => {
  emit('open-details', demand)
}

const formattedDate = computed(() => {
  return formatDate(props.selectedDate)
})

</script>

<style scoped>
.v-dialog {
  z-index: 3000 !important;
}
</style>