<template>
  <div class="position-relative mx-n4 d-flex flex-column" :style="{ height: `${headerHeight}px` }">
    <div ref="placeholder" :style="{ height: `${headerHeight}px`, width: '100%' }" class="position-absolute " />
    <div ref="titleRef" :class="['main-title px-4  py-16']" :style=headerStyle class="">
      <div class="d-flex justify-space-between align-center mb-2">
        <div class="d-flex flex-column" >
          <div class="d-flex align-center">
            <span :style="{ fontSize: titleFontSize + 'px !important' }"
              class="text-h4 d-inline-block font-weight-medium font-weight-bold">Bienvenue </span>
            <span :style="{ fontSize: titleFontSize + 'px !important' }"
              class="text-h4 d-inline-block font-weight-medium ml-2 gradient font-weight-bold">{{ userName }}</span>
          </div>
          <span :style="{ fontSize: subtitleFontSize + 'px !important' }" style="text-overflow: ellipsis;  overflow: hidden; white-space: nowrap;" class="text-overline text-medium-emphasis">Tableau de bord </span>
        </div>
        <v-btn v-if="!smAndDown" height="48px"
          class="px-6 bg-surfaceContainerHighest text-remplacement highlight-shadow new-demand-button" flat
          style="border-radius: 16px !important" prepend-icon="mdi-plus" @click="$router.push('/calendar')">
          Nouvelle demande
        </v-btn>
      </div>

    </div>

  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, reactive, nextTick, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'


const { smAndDown } = useDisplay()
const { mdAndUp } = useDisplay()
const router = useRouter()

const props = defineProps({
  userName: {
    type: String,
    required: true,
  },
  backButton: {
    type: Boolean,
    required: false,
  },
})

const titleRef = ref(null)
const placeholder = ref(null)
const actionsRef = ref(null)
const isSticky = ref(false)
const headerHeight = ref(0)
const headerWidth = ref('100%')
const titleMaxWidth = ref(0)
const scrolledValue = ref(1)
const safeMarginTop = ref(0)


const safeAreaTop = computed(() => {
  return getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top') || '0px'
})


const titleFontSize = computed(() => {
  const baseSize = smAndDown.value ? 20 : 32 // Equivalent to text-h5/text-h4
  const minSize = smAndDown.value ? 10 : 10
  const scaledSize = minSize + (baseSize - minSize) * (scrolledValue.value)

  return scaledSize
})

const subtitleFontSize = computed(() => {
  const baseSize = smAndDown.value ? 10 : 10
  const minSize = smAndDown.value ? 8 : 8
  const scaledSize = minSize + (baseSize - minSize) * (scrolledValue.value)
  return scaledSize
})
// Update width when window resizes
function updateHeaderWidth() {
  if (placeholder.value) {
    headerWidth.value = `${placeholder.value.offsetWidth}px`
  }

}

function updateTitleMaxWidth() {
  nextTick(() => {
    if (titleRef.value && actionsRef.value && placeholder.value) {
      const totalWidth = placeholder.value.offsetWidth
      const actionsWidth = actionsRef.value.offsetWidth
      // 32px de padding horizontal (px-4) de chaque côté + 8px de gap
      const padding = 32 * 2 + 8
      // On laisse au moins 16px de marge de sécurité
      titleMaxWidth.value = Math.max(0, totalWidth - actionsWidth - padding)
    }
  })
}


const resizeObserver = ref(null)
const observer = ref(null)

onMounted(() => {
  // Set initial height and width
  headerHeight.value = titleRef.value?.offsetHeight || 0
  updateHeaderWidth()
  updateTitleMaxWidth()

  safeMarginTop.value = 64 + parseInt(safeAreaTop.value?.replace('px', ''))
  console.log(safeMarginTop.value)


  // Observe intersection to toggle sticky state
  observer.value = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {  
        console.log(entry.intersectionRatio)
      let titlePadding = 60
      let initialTop = safeMarginTop.value
      let threshold = (initialTop - titlePadding) * -1
      let threshold2 = (initialTop - headerHeight.value) * -1
      
      let maxScrolledValue = 1
      let minScrolledValue = 0.6

      let A = (minScrolledValue - maxScrolledValue)/(threshold2 - threshold)
      let B = (maxScrolledValue + minScrolledValue - A*(threshold2 + threshold))/2

      scrolledValue.value = Math.min(1, Math.max(0.6, (-entry.boundingClientRect.top)*A + B))
      isSticky.value = entry.boundingClientRect.top - safeMarginTop.value + titlePadding <= 0
      })
    },
    {
      threshold: Array.from({ length: 101 }, (_, i) => i * 0.01),
      rootMargin: `-${safeMarginTop.value}px 0px 0px 0px `,
      root: null
    }
  )

  if (placeholder.value) {
    observer.value.observe(placeholder.value)
  }

  // Ajoute le ResizeObserver
  if (placeholder.value) {
    resizeObserver.value = new ResizeObserver(() => {
      updateHeaderWidth()
      updateTitleMaxWidth()
    })
    resizeObserver.value.observe(placeholder.value)
  }


  headerHeight.value = titleRef.value?.offsetHeight || 0


})

onUnmounted(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
  }
  observer.value.disconnect()


})

const headerStyle = reactive({
  position: computed(() => (isSticky.value ? 'fixed' : 'relative')),
  background: 'rgba(var(--v-theme-background), 1)',
  top: computed(() => (isSticky.value ? safeMarginTop.value+'px' : '0px')),
  padding: computed(() => (isSticky.value ? '4px 16px !important' : '64px 16px !important')),
  width: computed(() => headerWidth.value),
  zIndex: '10',

  borderBottom: computed(() => (isSticky.value ? '1px solid rgba(var(--v-theme-on-surface), 0.001)' : 'none')),

})


</script>

<style scoped>
/* .main-title.scrolled {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  position:fixed;
  margin-top: 64px;
  padding: 0 !important;
  background: rgba(var(--v-theme-background), 0.99);

} */



 
.gradient {

  fill: transparent;
  color: #000;
  font-weight: 900 !important;
  background: linear-gradient(to right, rgb(var(--v-theme-remplacement)) 20%, #a779cd 40%, rgb(var(--v-theme-permutation)) 60%, #dc8474 80%);
  background-size: 200% auto;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-fill-color: transparent;
  animation: animatedTextGradient 15s linear infinite;
}

.block {
  position: relative;
  z-index: 0;
  overflow: visible !important;

}

.block:after,
.block:before {
  content: '';
  position: absolute;
  left: -1.5px;
  top: -1.5px;
  opacity: 0.81;
  border-radius: 24px;
  background: linear-gradient(45deg, #ffc0d4, rgba(237, 202, 255, 0.94), rgba(250, 152, 248, 0.05),
      rgba(159, 159, 248, 0.22), #ffccdd);
  background-size: 400%;
  width: calc(100% + 3px);
  height: calc(100% + 3px);
  z-index: -1;
  animation: steam 15s linear infinite;
}

@keyframes steam {
  0% {
    background-position: 0 0;
  }

  80% {
    background-position: 400% 0;
  }

  100% {
    background-position: 400% 0;
  }
}

.block:after {
  filter: blur(20px);
}

.block:before {
  filter: blur(3px);
}

img.logo-md {
  transform-origin: bottom right;
  transform: scale(0.7);
}

img.logo-xs {
  transform-origin: bottom right;
  transform: scale(0.8) translateX(20px);
}
</style>