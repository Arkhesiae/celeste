<template>
  <v-dialog v-model="modelValue" :z-index="2500" :style="{ zIndex: 2500 }"
    :transition="smAndDown ? 'slide-x-reverse-transition' : 'scale-transition'" :fullscreen="smAndDown"
    :max-width="maxWidth" :persistent="persistent" :retain-focus="false" @after-enter="handleAfterEnter"
    @after-leave="handleAfterLeave">
    <v-card height="100vh" :class="smAndDown ? '' : 'rounded-xxl'" class="pt-0 pb-6 px-0 overflow-y-hidden">
      <!-- Header avec titre et boutons -->
      <div ref="headerRef" :style="{
        paddingTop: 'calc(var(--safe-area-top,0px) + 8px) !important',
        paddingLeft: smAndDown ? '4px !important' : '24px !important',
      }" :class="[
          'pb-2 pr-2  d-flex align-center justify-space-between pa-0 ma-0 transition-all duration-300',
          isScrolled ? 'bg-surfaceContainerHigh' : ''
        ]">
        <div class="d-flex align-center justify-space-between flex-grow-1">
          <div class="d-flex align-center">
            <v-btn v-if="smAndDown && showCloseButton" icon="mdi-arrow-left" variant="text" class="mr-1"
              @click="handleClose" />

            <span :class="{
              'text-h6': !smAndDown,
              'text-h7': smAndDown
            }" class=" font-weight-medium"> 
              {{ title }}
            </span>
          </div>


          <v-btn v-if="!smAndDown && showCloseButton" icon="mdi-close" variant="text" @click="handleClose" />
        </div>

        <div v-if="smAndDown" class="d-flex align-center gap-2">
          <slot name="actions" />
        </div>
      </div>



      <!-- Contenu principal -->
      <v-card-text ref="contentRef" class="px-6 pb-0 ma-0 overflow-y-auto flex-column d-flex justify-space-between">
        <div ref="sentinel" class="flex-grow-0 flex-shrink-0" />
        <div ref="content" class="flex-grow-1 flex-shrink-0">
          <slot name="content" />
        </div>

        <div class="pa-0 ma-0 mt-6 flex-shrink-0">
          <slot name="footer" />
        </div>
      </v-card-text>

      <!-- Footer optionnel -->
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useDisplay } from 'vuetify';

// Model definition
const modelValue = defineModel({
  type: Boolean,
  default: false
})

// Props
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  maxWidth: {
    type: [String, Number],
    default: '600px'
  },
  persistent: {
    type: Boolean,
    default: false
  },
  showCloseButton: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['close'])
const { smAndDown } = useDisplay();

const isScrolled = ref(false)
const sentinel = ref(null)

const handleClose = () => {
  emit('close')
  modelValue.value = false
}

const handleAfterEnter = () => {
  if (sentinel.value) {
    observer.observe(sentinel.value)
  }
}

const handleAfterLeave = () => {
  if (sentinel.value) {
    observer.unobserve(sentinel.value)
  }
}

let observer = null

// Lifecycle hooks
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        isScrolled.value = !entry.isIntersecting
      })
    },
    { root: null, threshold: [0.0, 1.0] }
  )
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.bg-surfaceContainerHigh-elevated {
  background-color: rgb(var(--v-theme-surfaceContainerHigh));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.transition-all {
  transition: all 0.3s ease;
}

.rounded-xxl {
  border-radius: 28px !important;
}
</style>
