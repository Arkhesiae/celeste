<template>
  <div class="days-grid pa-4 mt-4">
    <div
      v-for="(day, idx) in rotation"
      :key="idx"
      class="day-item"
      @click="$emit('day-click', day)"
    >
      <v-tooltip :text="day?.type === 'rest' ? 'Repos' : 'Travail'" location="top">
        <template v-slot:activator="{ props }">
          <div class="day-content" v-bind="props">
            <div class="text-subtitle-1 font-weight-bold text-medium-emphasis ">
              {{ day?.name === 'Rest Day' ? 'R' : day?.name?.slice(0, 2) }}
            </div>
          </div>
        </template>
      </v-tooltip>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  rotation: {
    type: Array,
    required: true
  }
});

defineEmits(['day-click']);

const getProgressStyle = (startTime, endTime) => {
  if (!startTime || !endTime) return { width: '0%' };
  
  const totalMinutesInDay = 1440;
  const convertToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const startMinutes = convertToMinutes(startTime);
  const endMinutes = convertToMinutes(endTime);
  const percentage = ((endMinutes - startMinutes) / totalMinutesInDay) * 100;

  return {
    width: `${percentage}%`
  };
};
</script>

<style scoped>
.days-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, 48px);
  gap: 8px;
  width: 100%;
  justify-content: center;
}

.day-item {
  width: 48px;
  height: 48px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.day-content {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgb(var(--v-theme-background));
  border-radius: 20px;
  transition: transform 0.2s ease;
}



</style> 