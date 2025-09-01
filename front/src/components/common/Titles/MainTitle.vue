<template>
  <div class="position-relative mx-n2 d-flex flex-column" :style="{ height: `${headerHeight}px` }">
    <div ref="placeholder" :style="{ height: `${headerHeight}px`, width: '100%' }" class="position-absolute " />
    <div ref="titleRef" :class="['main-title px-4  py-16']" :style=headerStyle class="">
      <div class="d-flex justify-space-between align-center flex-shrink-0 ">
        <div class="d-flex align-center ga-4 ">
          <v-btn v-if="backButton" icon="mdi-arrow-left" variant="text" @click="router.back()" />
          <div
            class="d-flex flex-column"
            :style="{ transformOrigin: 'left', maxWidth: titleMaxWidth + 'px' }"
          >
            <div class="d-flex align-center">
              <span :style="{ fontSize: titleFontSize + 'px !important' }" class="font-weight-bold" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">{{ title }} </span>
            </div>
            <span :style="{ fontSize: subtitleFontSize + 'px !important' }" style="font-weight: 600; text-overflow: ellipsis;  overflow: hidden; white-space: nowrap;" class="opacity-50">{{ subtitle }} </span>
          </div>
         
      
        </div>
        <div class="flex-shrink-0" ref="actionsRef">
          <slot name="actions" />
        </div>
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

const titleRef = ref(null)
const placeholder = ref(null)
const actionsRef = ref(null)
const isSticky = ref(false)
const headerHeight = ref(0)
const headerWidth = ref('100%')
const titleMaxWidth = ref(0)
const scrolledValue = ref(1) 

const safeMarginTop = ref(0)
const titleFontSize = computed(() => {
  const baseSize = smAndDown.value ? 20 : 32 // Equivalent to text-h5/text-h4
  const minSize = smAndDown.value ? 10 : 10
  const scaledSize = minSize + (baseSize - minSize) * (scrolledValue.value )
  
  return scaledSize
})

const subtitleFontSize = computed(() => {
  const baseSize = smAndDown.value ? 10 : 12
  const minSize = smAndDown.value ? 8 : 8
  const scaledSize = minSize + (baseSize - minSize) * (scrolledValue.value )
  return scaledSize
})



const safeAreaTop = computed(() => {
  return getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top') || '0px'
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
      titleMaxWidth.value = Math.max(0, totalWidth - actionsWidth - padding )
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
  background: 'rgba(var(--v-theme-background), 0.99)',
  top: computed(() => (isSticky.value ? safeMarginTop.value+'px' : '0px')),
  padding: computed(() => (isSticky.value ? '4px 16px !important' : '64px 16px !important')),
  width: computed(() => headerWidth.value),
  zIndex: '10',

  borderBottom: computed(() => (isSticky.value ? '1px solid rgba(var(--v-theme-on-surface), 0.05)' : 'none')),

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

.debug {
  border: 1px solid red !important;
}

.debug-title {
  border: 1px solid blue !important;
}
</style>