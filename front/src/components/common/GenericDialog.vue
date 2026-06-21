<template>
  <v-dialog
v-model="modelValue" :transition="smAndDown ? 'slide-x-reverse-transition' : 'scale-transition'"
    :fullscreen="smAndDown" :max-width="maxWidth" :persistent="persistent" :retain-focus="false"
    @after-enter="handleAfterEnter" @after-leave="handleAfterLeave">
    <v-card height="100vh" :class="smAndDown ? '' : 'rounded-xxl'" class="pt-0 pb-6 px-0 overflow-y-hidden">
      <!-- Header -->
      <div
ref="headerRef" :style="{
        paddingTop: 'calc(var(--safe-area-top, 0px) + 8px) !important',
        paddingLeft: smAndDown ? '4px !important' : '24px !important',
      }" :class="[
          'pb-2 pr-2 d-flex align-center justify-space-between pa-0 ma-0 transition-all',
          isScrolled ? 'bg-surfaceContainerHigh' : '',
        ]">
        <div class="d-flex align-center justify-space-between flex-grow-1">
          <div class="d-flex align-center">
            <v-btn
v-if="smAndDown && showCloseButton" icon="mdi-arrow-left" variant="text" class="mr-1"
              @click="handleClose" />
            <span :class="smAndDown ? 'text-body-large' : 'text-title-large'" class="font-weight-medium">
              {{ title }}
            </span>
          </div>

          <v-btn v-if="!smAndDown && showCloseButton" icon="mdi-close" variant="text" @click="handleClose" />
        </div>

        <div v-if="smAndDown" class="d-flex align-center gap-2">
          <slot name="actions" />
        </div>
      </div>

      <!-- Content -->
      <v-card-text ref="contentRef" class="px-6 pb-0 ma-0 overflow-y-auto flex-column d-flex justify-space-between">
        <div ref="sentinel" class="flex-grow-0 flex-shrink-0" />
        <div class="flex-grow-1 flex-shrink-0">
          <slot name="content" />
        </div>
        <div class="pa-0 ma-0 mt-6 flex-shrink-0">
          <slot name="footer" />
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup
        lang="ts">
        import { ref, onMounted, onUnmounted } from 'vue'
        import { useDisplay } from 'vuetify'

        const modelValue = defineModel<boolean>({ default: false })

        const props = withDefaults(defineProps<{
          title: string
          maxWidth?: string | number
          persistent?: boolean
          showCloseButton?: boolean
        }>(), {
          maxWidth: '600px',
          persistent: false,
          showCloseButton: true,
        })

        const emit = defineEmits<{
          close: []
        }>()

        const { smAndDown } = useDisplay()

        const isScrolled = ref(false)
        const sentinel = ref<HTMLElement | null>(null)
        const headerRef = ref<HTMLElement | null>(null)
        const contentRef = ref<HTMLElement | null>(null)

        let observer: IntersectionObserver | null = null

        const handleClose = (): void => {
          emit('close')
          modelValue.value = false
        }

        const handleAfterEnter = (): void => {
          if (sentinel.value) {
            observer?.observe(sentinel.value)
          }
        }

        const handleAfterLeave = (): void => {
          if (sentinel.value) {
            observer?.unobserve(sentinel.value)
          }
        }

        onMounted(() => {
          observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                isScrolled.value = !entry.isIntersecting
              })
            },
            { root: contentRef.value, threshold: [0.0, 1.0] },
          )
        })

        onUnmounted(() => {
          observer?.disconnect()
        })
</script>

<style scoped>
.transition-all {
  transition: all 0.3s ease;
}

.rounded-xxl {
  border-radius: 28px !important;
}
</style>