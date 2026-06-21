<template>
  <div class="d-flex justify-space-between align-center flex-shrink-0 position-fixed w-100 pa-4  bg-background"
    style="top: 0; left: 0 ; z-index: 1000;">
    <div class="d-flex align-center ga-4 ">
      <v-btn v-if="backButton" icon="mdi-arrow-left" variant="text" @click="router.back()" />
      <div class="d-flex flex-column" :style="{ transformOrigin: 'left' }">
        <div class="d-flex align-center">
          <span :style="{ fontSize: titleFontSize + 'px !important' }" class="font-weight-bold"
            style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">{{ title }} </span>
        </div>
        <span :style="{ fontSize: subtitleFontSize + 'px !important' }"
          style="font-weight: 600; text-overflow: ellipsis;  overflow: hidden; white-space: nowrap;"
          class="opacity-50">{{ subtitle }} </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'

const { smAndDown } = useDisplay()
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


const titleFontSize = computed(() => {
  const baseSize = smAndDown.value ? 20 : 32 // Equivalent to text-headline-small/text-headline-large
  // const minSize = smAndDown.value ? 10 : 10
  return baseSize
})

const subtitleFontSize = computed(() => {
  const baseSize = smAndDown.value ? 10 : 12
  // const minSize = smAndDown.value ? 8 : 8
  return baseSize
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