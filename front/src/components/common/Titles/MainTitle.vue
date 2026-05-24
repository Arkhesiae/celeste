<template>
  <div ref="titleRef" class="main-title px-4 py-16 mx-n2">
    <div class="d-flex justify-space-between align-center flex-shrink-0">
      <div class="d-flex align-center ga-4">
        <v-btn v-if="backButton" icon="mdi-arrow-left" variant="text" @click="router.back()" />
        <div class="d-flex flex-column" :style="{ maxWidth: titleMaxWidth + 'px' }">
          <div class="d-flex align-center">
            <span :style="{ fontSize: smAndDown ? '20px' : '32px' }" class="font-weight-bold"
              style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">{{ title }}</span>
          </div>
          <span :style="{ fontSize: smAndDown ? '10px' : '12px' }"
            style="font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;"
            class="opacity-50">{{ subtitle }}</span>
        </div>
      </div>
      <div ref="actionsRef" class="flex-shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'

const { smAndDown } = useDisplay()
const router = useRouter()

defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
  backButton: {
    type: Boolean,
    required: false,
  },
})

const emit = defineEmits(['exit-top', 'scrolled'])

const titleRef = ref(null)
const actionsRef = ref(null)
const titleMaxWidth = ref(0)
const isExiting = ref(false)
const safeMarginTop = ref(0)

const safeAreaTop = computed(() => {
  return getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top') || '0px'
})

function updateTitleMaxWidth () {
  nextTick(() => {
    if (titleRef.value && actionsRef.value) {
      const totalWidth = titleRef.value.offsetWidth
      const actionsWidth = actionsRef.value.offsetWidth
      // 32px of horizontal padding (px-4) on each side + 8px gap
      const padding = 32 * 2 + 8
      // Keep at least 16px safety margin
      titleMaxWidth.value = Math.max(0, totalWidth - actionsWidth - padding)
    }
  })
}

const resizeObserver = ref(null)
const observer = ref(null)

onMounted(() => {
  updateTitleMaxWidth()

  const val = safeAreaTop.value?.replace('px', '')
  safeMarginTop.value = 64 + (val ? parseInt(val) || 0 : 0)

  // Observe intersection to emit when title is about to exit the screen via the top
  observer.value = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const isExited = entry.boundingClientRect.top <= safeMarginTop.value
        if (isExiting.value !== isExited) {
          isExiting.value = isExited
          emit('exit-top', isExited)
          emit('scrolled', isExited)
        }
      })
    },
    {
      threshold: Array.from({ length: 21 }, (_, i) => i * 0.05),
      rootMargin: `-${safeMarginTop.value}px 0px 0px 0px`,
      root: null
    }
  )

  if (titleRef.value) {
    observer.value.observe(titleRef.value)
  }

  // Setup ResizeObserver for responsive width calculations
  if (titleRef.value) {
    resizeObserver.value = new ResizeObserver(() => {
      updateTitleMaxWidth()
    })
    resizeObserver.value.observe(titleRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
  }
  if (observer.value) {
    observer.value.disconnect()
  }
})
</script>

<style scoped>
.debug {
  border: 1px solid red !important;
}

.debug-title {
  border: 1px solid blue !important;
}
</style>