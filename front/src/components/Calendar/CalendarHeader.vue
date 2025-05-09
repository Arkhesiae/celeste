<template>
  <div class="d-flex align-center justify-space-between mb-4"
       :class="smAndDown ? 'mx-auto' : ''"
       :style="smAndDown ? 'max-width : 600px' : ''"
  >

    <div class="d-flex align-center">
      <h2 class="text-h4 font-weight-medium mb-0">{{ currentMonthName }} {{ currentYear }}</h2>
      <v-btn
        v-if="!isCurrentMonthAndYear"
        icon
        variant="text"
        class="ml-2"
        @click="goToToday"
      >
        <v-icon>mdi-calendar-today</v-icon>
      </v-btn>
    </div>

    

    <div class="d-flex">
      <v-btn
        icon
        variant="text"
        class="mr-2"
        @click="navigateMonth(-1)"
      >
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>
      <v-btn
        icon
        variant="text"
        @click="navigateMonth(1)"
      >
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>
    </div>
  </div>

</template>

<script setup>
import { computed } from 'vue';
import { useDisplay } from "vuetify";

const props = defineProps({
  currentMonth: {
    type: Number,
    required: true
  },
  currentYear: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['update:currentMonth', 'update:currentYear']);

const { smAndDown } = useDisplay();

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const currentMonthName = computed(() => monthNames[props.currentMonth]);

const isCurrentMonthAndYear = computed(() => {
  const now = new Date();
  return props.currentMonth === now.getMonth() && props.currentYear === now.getFullYear();
});

const navigateMonth = (direction) => {
  let newMonth = props.currentMonth + direction;
  let newYear = props.currentYear;
  
  if (newMonth > 11) {
    newMonth = 0;
    newYear++;
  } else if (newMonth < 0) {
    newMonth = 11;
    newYear--;
  }
  
  emit('update:currentMonth', newMonth);
  emit('update:currentYear', newYear);
};

const goToToday = () => {
  const now = new Date();
  emit('update:currentMonth', now.getMonth());
  emit('update:currentYear', now.getFullYear());
};
</script>

<style scoped>
.text-h7 {
  font-size: 1.1rem;
  line-height: 1.2;
}

.v-btn {
  color: var(--v-primary-base);
}
</style>
