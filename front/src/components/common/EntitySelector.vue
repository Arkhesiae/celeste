<template>
  <v-card rounded="xl" elevation="0" class="pa-4 overflow-hidden d-flex flex-column" color="surfaceContainer" style="max-height: 100%;">
    <v-card-title v-if="title" class="text-h6 font-weight-medium mb-4 flex-grow-0">{{ title }}</v-card-title>
    <div class="version-list-container flex-grow-1 overflow-hidden">
      <div class="version-list d-flex flex-column ga-2 overflow-y-auto hide-scrollbar" ref="scrollContainer" @scroll="handleScroll">
        <div v-for="item in items" :key="item[itemKey]"
          class="version-item  pa-3 rounded-lg cursor-pointer transition-all" :class="[
            modelValue?.[itemKey] === item[itemKey] ? 'selected-version' : 'version-hover',
            itemStatus && item[itemStatus] === 'future' ? 'future-version' : '',
            itemStatus && item[itemStatus] === 'current' ? 'current-version' : ''
          ]" @click="selectItem(item)">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex flex-column">
              <span class="text-h6 font-weight-bold">{{ prefix ? prefix + ' ' + item[itemTitle] : item[itemTitle] }}</span>
              <span class="text-caption text-medium-emphasis">{{ itemSubtitle ? item[itemSubtitle] : '' }}</span>
            </div>
            <div class="d-flex align-center">
              <slot name="statusChip" :item="item">
                <v-chip v-if="itemStatus && item[itemStatus] === 'future'" size="x-small" color="warning" variant="tonal" rounded="lg">
                  Future
                </v-chip>
                <v-chip v-else-if="itemStatus && item[itemStatus] === 'current'" size="x-small" color="onBackground" variant="flat" rounded="lg">
                  Actuelle
                </v-chip>
             
              </slot>
            </div>
          </div>
          <div>
            <slot name="itemDetails" :item="item" />
          </div>
        </div>
      </div>
      <div class="scroll-indicator-top" :class="{ 'hidden': isScrolledToTop }"></div>
      <div class="scroll-indicator-bottom" :class="{ 'hidden': isScrolledToBottom }"></div>
    </div>
  </v-card>
</template>

<script setup>
import { defineProps, defineEmits, ref, onMounted, nextTick } from 'vue';

const props = defineProps({
  items: { type: Array, required: true },
  itemKey: { type: String, required: true },
  itemTitle: { type: String, required: true },
  itemSubtitle: { type: String, default: '' },
  prefix: { type: String, default: '' },
  itemStatus: { type: String, default: '' },
  title: { type: String, default: 'Sélectionner un élément' },
  maxHeight: { type: String, default: '40vh' }
});

const modelValue = defineModel();

const emit = defineEmits(['update:modelValue']);

const scrollContainer = ref(null);
const isScrolledToBottom = ref(false);
const isScrolledToTop = ref(false);

function selectItem(item) {
  item[props.itemKey] = item[props.itemKey];
  modelValue.value = item;
  console.log(modelValue.value?.[props.itemKey] );
  console.log(item);
  emit('update:modelValue', item);
}

function handleScroll() {
  if (!scrollContainer.value) return;
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
  const threshold = 5;
  isScrolledToBottom.value = scrollTop + clientHeight >= scrollHeight - threshold;
  isScrolledToTop.value = scrollTop <= threshold;
}

onMounted(() => {
  nextTick(() => {
    handleScroll();
  });
});
</script>

<style scoped>
/* Layout */
.version-list-container {
  position: relative;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.version-list {
  max-height: 100% !important;
  height: 100% !important;
  min-height: 0;
  position: relative;
  flex: 1;
}

/* Scroll indicators */
.scroll-indicator-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(to top, transparent, rgba(var(--v-theme-surfaceContainer), 1));
  pointer-events: none;
  z-index: 1000 !important;
  transition: opacity 0.3s ease;
}

.scroll-indicator-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(to bottom, transparent, rgba(var(--v-theme-surfaceContainer), 1));
  pointer-events: none;
  z-index: 1000 !important;
  transition: opacity 0.3s ease;
}

.scroll-indicator-top.hidden,
.scroll-indicator-bottom.hidden {
  opacity: 0;
}

/* Items */
.version-item {
  border: 1px solid transparent;
  transition: all 0.2s ease-in-out;
}

.version-hover:hover {
  background-color: rgba(var(--v-theme-remplacement), 0.05);
  border-color: rgba(var(--v-theme-remplacement), 0.1);
}

.selected-version {
  background-color: rgba(var(--v-theme-surfaceContainerHighest), 0.8);
  border-color: rgba(var(--v-theme-surfaceContainerHighest), 0.3);
}

.cursor-pointer {
  cursor: pointer;
}

.transition-all {
  transition: all 0.2s ease-in-out;
}

/* Hide scrollbar */
.hide-scrollbar {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer 10+ */
}

.hide-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
</style>