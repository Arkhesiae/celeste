<template>
  <v-dialog
    v-model="modelValue"
    :transition="smAndDown ? 'slide-x-reverse-transition' : 'scale-transition'"
    :fullscreen="smAndDown"
    :max-width="maxWidth"
    :persistent="persistent"
    :retain-focus="retainFocus"
    @after-enter="handleAfterEnter"
    @after-leave="handleAfterLeave"
  >
    <v-card :class="smAndDown ? '' : 'rounded-xxl'" class="pt-0 pb-4 px-0 overflow-y-hidden">
      <!-- Header -->
      <div
        ref="headerRef"
        :style="{
          paddingTop: 'calc(var(--safe-area-top, 0px) + 8px) !important',
          paddingLeft: smAndDown ? '4px !important' : '24px !important',
        }"
        :class="[
          'pb-2 pr-2 d-flex align-center justify-space-between pa-0 ma-0 transition-all',
          isScrolled ? 'bg-surfaceContainerHigh' : '',
        ]"
      >
        <div class="d-flex align-center justify-space-between flex-grow-1">
          <div class="d-flex align-center">
            <v-btn
              v-if="smAndDown && showCloseButton"
              icon="mdi-arrow-left"
              aria-label="Retour"
              variant="text"
              class="mr-1"
              @click="handleClose"
            />
            <span :class="smAndDown ? 'text-body-large' : 'text-title-large'" class="font-weight-medium">
              {{ title }}
            </span>
          </div>

          <v-btn
            v-if="!smAndDown && showCloseButton"
            icon="mdi-close"
            aria-label="Fermer"
            variant="text"
            @click="handleClose"
          />
        </div>

        <div v-if="smAndDown" class="d-flex align-center ga-2">
          <slot name="actions" />
        </div>
      </div>

      <!-- Content -->
      <v-card-text ref="contentRef" class="px-6 pb-0 ma-0 overflow-y-auto flex-column d-flex justify-space-between">
        <div ref="sentinel" class="flex-grow-0 flex-shrink-0" />
        <div class="flex-grow-1 flex-shrink-0">
          <slot name="content" />
        </div>
        <!-- v-card-actions dans un v-dialog : les boutons du slot prennent la taille et le style par défaut (plugins/vuetify.js) -->
        <v-card-actions
          v-if="$slots.footer"
          class="generic-dialog__footer justify-space-between pa-0 ma-0 mt-6 flex-shrink-0"
        >
          <slot name="footer" />
        </v-card-actions>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useDisplay } from 'vuetify';

const modelValue = defineModel<boolean>({ default: false });

const props = withDefaults(
  defineProps<{
    title: string;
    maxWidth?: string | number;
    persistent?: boolean;
    showCloseButton?: boolean;
    /** Garde le focus clavier dans la fenêtre */
    retainFocus?: boolean;
  }>(),
  {
    maxWidth: '600px',
    persistent: false,
    showCloseButton: true,
    retainFocus: false,
  },
);

const emit = defineEmits<{
  close: [];
}>();

const { smAndDown } = useDisplay();

const isScrolled = ref(false);
const sentinel = ref<HTMLElement | null>(null);
const headerRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);

let observer: IntersectionObserver | null = null;

const handleClose = (): void => {
  emit('close');
  modelValue.value = false;
};

const handleAfterEnter = (): void => {
  if (sentinel.value) {
    observer?.observe(sentinel.value);
  }
};

const handleAfterLeave = (): void => {
  if (sentinel.value) {
    observer?.unobserve(sentinel.value);
  }
};

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        isScrolled.value = !entry.isIntersecting;
      });
    },
    { root: contentRef.value, threshold: [0.0, 1.0] },
  );
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<style scoped>
.transition-all {
  transition: all 0.3s ease;
}

/* Un conteneur posé dans le slot (div d-flex...) occupe toute la largeur de la rangée d'actions */
.generic-dialog__footer > div {
  flex: 1 1 auto;
}

.rounded-xxl {
  border-radius: 28px !important;
}
</style>
