<template>
  
</template>

<script setup>
import { useDisplay } from 'vuetify';
import LocalRecommendationsCard from '@/components/Dashboard/LocalRecommendationsCard.vue';
import ActiveRotationCard from '@/components/Dashboard/ActiveRotationCard.vue';
import DashboardCalendarSection from '@/components/Dashboard/DashboardCalendarSection.vue';
import TeamCard from '@/components/Dashboard/TeamCard.vue';

const props = defineProps({
  stats: { type: Object, required: true },
  currentMonth: { type: Number, required: true },
  currentYear: { type: Number, required: true },
  daysOfWeek: { type: Array, required: true },
  calendarDays: { type: Array, required: true },
  isSelected: { type: Function, required: true },
  isToday: { type: Function, required: true },
  rotationsMap: { type: Map, required: true },
});

const emit = defineEmits([
  'transfer',
  'update:currentMonth',
  'update:currentYear',
  'selectDay',
  'swipeLeft',
  'swipeRight',
]);

const { smAndDown } = useDisplay();
</script>

<style scoped>
.right-col {
  width: 500px !important;
  min-width: 500px !important;
}

.pb-32 {
  padding-bottom: 128px !important;
}
</style>
