<template>
  <v-overlay :model-value="modelValue" scrim="rgba(0, 0, 0, 0.5)" content-class="overlay"
    class="position-relative align-end justify-end" @update:model-value="handleClose">
    <v-slide-x-reverse-transition appear>
      <div v-if="modelValue" class="d-flex flex-column drawer-container">
        <div ref="headerRef" :style="{
          paddingTop: 'calc(var(--safe-area-top,0px) + 8px) !important',
          paddingLeft: smAndDown ? '4px !important' : '24px !important',
        }" :class="[
            'pb-2 pr-2  d-flex align-center justify-space-between pa-0 ma-0 transition-all duration-300',
            isScrolled ? 'bg-surfaceContainerHigh' : ''
          ]">
          <div class="d-flex align-center justify-space-between flex-grow-1">
            <div class="d-flex align-center">
              <v-btn v-if="smAndDown" icon="mdi-arrow-left" variant="text" class="mr-1" @click="handleClose" />

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
            <slot name="actions" />
          </div>
        </div>

        <v-row class="px-6">
          <v-col cols="12">
            <AvailableDemands :selected-date="selectedDate" @handle-replacement="handleReplacement"
              @handle-switch="handleSwitch" @open-details="openDemand" />
          </v-col>
        </v-row>

      </div>
    </v-slide-x-reverse-transition>
  </v-overlay>
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
.drawer-container {
  max-width: 600px;
  width: 100%;
  height: 100vh;
  background-color: rgba(var(--v-theme-surfaceContainer));
}

:deep(.v-overlay__content) {
  display: flex !important;
  align-items: flex-end !important;
  justify-content: end !important;
  width: 100vw !important;
  max-width: 600px !important;
}
</style>