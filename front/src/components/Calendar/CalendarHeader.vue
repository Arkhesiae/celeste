<template>
  <div v-if="!smAndDown" class="d-flex align-center justify-space-between mb-4" :class="smAndDown ? 'mx-auto' : ''"
    :style="smAndDown ? 'max-width : 600px' : ''">
    <div class="d-flex align-center">
      <div class="d-flex align-center bg-surfaceContainerHighest rounded-lg pa-2 px-4">
        <h2 class="text-body-2 font-weight-medium mb-0">
          {{ selectedMonthName }} <span v-if="!isCurrentYear">{{ selectedYear }}</span>
        </h2>
      </div>

      <v-slide-x-reverse-transition>
        <v-btn v-if="!isCurrentMonthAndYear" icon variant="text" class="ml-2" @click="emit('goToToday')">
          <v-icon>mdi-undo</v-icon>
        </v-btn>
      </v-slide-x-reverse-transition>
    </div>

    <div class="d-flex">
      <v-btn icon variant="text" class="mr-2" @click="emit('navigateMonth', -1)">
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>
      <v-btn icon variant="text" @click="emit('navigateMonth', 1)">
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>
    </div>
  </div>
  <!-- Indicateurs de navigation -->
  <div v-else class="calendar-indicators mx-auto mb-8" :style="smAndDown ? 'max-width : 600px' : ''">
    <v-btn icon="mdi-chevron-left" variant="text" size="small" @click="emit('navigateMonth', -1)" />
    <div class="month-indicator">
      {{ selectedMonthName }} <span v-if="!isCurrentYear">{{ selectedYear }}</span>
    </div>
    <v-btn icon="mdi-chevron-right" variant="text" size="small" @click="emit('navigateMonth', 1)" />
  </div>
</template>

<script setup>

import { useDisplay } from "vuetify";

const props = defineProps({
  selectedMonth: {
    type: Number,
    required: true
  },
  selectedYear: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['navigateMonth', 'goToToday']);

const { smAndDown } = useDisplay();

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const selectedMonthName = computed(() => monthNames[props.selectedMonth - 1]);

const isCurrentYear = computed(() => {
  const now = Temporal.Now.plainDateISO();
  return props.selectedYear === now.year;
});

const isCurrentMonthAndYear = computed(() => {
  const now = Temporal.Now.plainDateISO();
  const selected = Temporal.PlainYearMonth.from({
    year: props.selectedYear,
    month: props.selectedMonth,
  });
  return selected.equals(now.toPlainYearMonth());
});
</script>

<style scoped>
.text-h7 {
  font-size: 1.1rem;
  line-height: 1.2;
}

.v-btn {
  color: var(--v-primary-base);
}

.calendar-indicators {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 0 16px;
}


.month-indicator {
  font-weight: 600;
  font-size: 1.0rem;
  color: rgb(var(--v-theme-onSurface));
  text-align: center;
  flex: 1;
}
</style>
