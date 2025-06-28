<template>
  <div class="calendar-swipe-container">
    <!-- Container principal avec 3 fenêtres -->
    <div class="calendar-windows-container" ref="containerRef" v-touch="{
      left: () => handleGesture('left'),
      right: () => handleGesture('right'),
      start: handleGestureStart,
      move: handleGestureMove,
      end: handleGestureEnd
    }">
      <!-- Fenêtre précédente -->
      <div class="calendar-window" style="border: 1px solid green;" :class="{ 'active': currentWindow === 0 }">
        <CalendarMonth 
          :calendarDays="previousMonthDays" 
          :daysOfWeek="daysOfWeek"
          :isSelected="isSelected"
          :isToday="isToday"
          :vacationsOfUser="vacationsOfUser"
          @select-day="$emit('select-day', $event)"
        />
      </div>

      <!-- Fenêtre actuelle -->
      <div class="calendar-window" style="border: 1px solid blue;" :class="{ 'active': currentWindow === 1 }">
        <CalendarMonth 
          :calendarDays="currentMonthDays" 
          :daysOfWeek="daysOfWeek"
          :isSelected="isSelected"
          :isToday="isToday"
          :vacationsOfUser="vacationsOfUser"
          @select-day="$emit('select-day', $event)"
        />
      </div>

      <!-- Fenêtre suivante -->
      <div class="calendar-window" style="border: 1px solid red;" :class="{ 'active': currentWindow === 2 }">
        <CalendarMonth 
          :calendarDays="nextMonthDays" 
          :daysOfWeek="daysOfWeek"
          :isSelected="isSelected"
          :isToday="isToday"
          :vacationsOfUser="vacationsOfUser"
          @select-day="$emit('select-day', $event)"
        />
      </div>
    </div>

    <!-- Indicateurs de navigation -->
    <div class="calendar-indicators">
      <v-btn 
        icon="mdi-chevron-left" 
        variant="text" 
        size="small"
        @click="navigateMonth(-1)"
        :disabled="isAnimating"
      />
      <div class="month-indicator">
        {{ currentMonthName }}
      </div>
      <v-btn 
        icon="mdi-chevron-right" 
        variant="text" 
        size="small"
        @click="navigateMonth(1)"
        :disabled="isAnimating"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useShiftStore } from '@/stores/shiftStore';
import CalendarMonth from './CalendarMonth.vue';

const substitutionStore = useSubstitutionStore();
const shiftStore = useShiftStore();

const props = defineProps({
  daysOfWeek: Array,
  calendarDays: Array,
  isSelected: Function,
  isToday: Function,
  rotationsMap: Map,
});

const emit = defineEmits(['select-day', 'swipe-left', 'swipe-right', 'month-changed']);

// État pour la gestion des fenêtres
const currentWindow = ref(1); // 0: précédent, 1: actuel, 2: suivant
const isAnimating = ref(false);
const containerRef = ref(null);

const currentMonth = ref(new Date().getMonth());
const currentYear = ref(new Date().getFullYear());

// État pour la gestion des gestes
const gestureState = ref({
  isActive: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  deltaX: 0,
  deltaY: 0,
  velocity: 0,
  startTime: 0
});

// Computed properties pour les données des shifts
const shiftsWithSubstitutions = computed(() => {
  return shiftStore.shiftsWithSubstitutions;
});

const vacationsOfUser = computed(() => {
  const map = new Map();
  const shifts = shiftsWithSubstitutions.value;
  if (shifts && shifts.length > 0) {
    shifts.forEach(({ date, shift, teamObject }) => {
      map.set(date, { shift, teamObject });
    });
  }
  return map;
});

// Calcul des mois
const previousMonth = computed(() => {
  const month = currentMonth.value - 1;
  const year = month < 0 ? currentYear.value - 1 : currentYear.value;
  return { month: month < 0 ? 11 : month, year };
});

const nextMonth = computed(() => {
  const month = currentMonth.value + 1;
  const year = month > 11 ? currentYear.value + 1 : currentYear.value;
  return { month: month > 11 ? 0 : month, year };
});

// Génération des jours pour chaque mois
const previousMonthDays = computed(() => {
  return generateCalendarDays(previousMonth.value.year, previousMonth.value.month);
});

const currentMonthDays = computed(() => {
  return generateCalendarDays(currentYear.value, currentMonth.value);
});

const nextMonthDays = computed(() => {
  return generateCalendarDays(nextMonth.value.year, nextMonth.value.month);
});

// Nom du mois actuel
const currentMonthName = computed(() => {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return months[currentMonth.value];
});

// Fonction pour générer les jours d'un mois
const generateCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay() + 1); // Commencer par lundi

  const days = [];
  const currentDate = new Date(startDate);

  while (currentDate <= lastDay || days.length < 6) { // 6 semaines max
    const week = [];
    for (let i = 0; i < 7; i++) {
   
      let date = new Date(currentDate);
      date.setUTCHours(0, 0, 0, 0);
      week.push({
        date: date,
        isInMonth: currentDate.getMonth() === month
      });
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    days.push(week);
  }
  console.log(days.length);
  return days;
};

// Fonction principale de gestion des gestes
const handleGesture = (direction) => {
  if (isAnimating.value) return;
  
  // Vérifier si le geste est valide
  if (!isValidGesture(direction)) return;
  
  if (direction === 'left') {
    navigateMonth(1); // Swipe vers la gauche = mois suivant
  } else if (direction === 'right') {
    navigateMonth(-1); // Swipe vers la droite = mois précédent
  }
};

// Validation du geste
const isValidGesture = (direction) => {
  const { deltaX, deltaY, velocity } = gestureState.value;
  
  // Seuil minimum pour déclencher le geste
  const minSwipeDistance = 100;
  const maxVerticalSwipe = 100;
  const minVelocity = 0.3;
  
  // Vérifier la distance horizontale
  if (Math.abs(deltaX) < minSwipeDistance) return false;
  
  // Vérifier que le geste est principalement horizontal
  if (Math.abs(deltaY) > maxVerticalSwipe) return false;
  
  // Vérifier la cohérence de la direction
  if (direction === 'left' && deltaX > 0) return false;
  if (direction === 'right' && deltaX < 0) return false;
  
  // Vérifier la vélocité (optionnel)
  if (Math.abs(velocity) < minVelocity) return false;
  
  return true;
};

// Gestion du début du geste
const handleGestureStart = (wrapperEvent) => {
  const { touchstartX, touchstartY } = wrapperEvent;
  
  gestureState.value = {
    isActive: true,
    startX: touchstartX,
    startY: touchstartY,
    currentX: touchstartX,
    currentY: touchstartY,
    deltaX: 0,
    deltaY: 0,
    velocity: 0,
    startTime: Date.now()
  };
  
  // Ajouter la classe pour désactiver les transitions pendant le swipe
  if (containerRef.value) {
    containerRef.value.classList.add('swiping');
  }
};

// Gestion du mouvement du geste
const handleGestureMove = (wrapperEvent) => {
  if (!gestureState.value.isActive) return;
  
  const { touchmoveX, touchmoveY } = wrapperEvent;
  const currentTime = Date.now();
  
  // Mettre à jour l'état du geste
  gestureState.value.currentX = touchmoveX;
  gestureState.value.currentY = touchmoveY;
  gestureState.value.deltaX = touchmoveX - gestureState.value.startX;
  gestureState.value.deltaY = touchmoveY - gestureState.value.startY;
  
  // Calculer la vélocité
  const timeDelta = currentTime - gestureState.value.startTime;
  if (timeDelta > 0) {
    gestureState.value.velocity = gestureState.value.deltaX / timeDelta;
  }
  
  // Appliquer une transformation en temps réel pour un effet de suivi
  const container = containerRef.value;
  if (container && Math.abs(gestureState.value.deltaX) > 20) {
    const maxDelta = 800;
    const clampedDelta = Math.max(-maxDelta, Math.min(maxDelta, gestureState.value.deltaX));
    container.style.transform = `translateX(${clampedDelta}px)`;
  }
};

// Gestion de la fin du geste
const handleGestureEnd = (wrapperEvent) => {
  if (!gestureState.value.isActive) return;
  
  // Déterminer la direction du geste
  const { deltaX, deltaY } = gestureState.value;
  const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
  
  if (isHorizontalSwipe && Math.abs(deltaX) > 50) {
    const direction = deltaX > 0 ? 'right' : 'left';
    handleGesture(direction);
  }
  
  // Réinitialiser l'état du geste
  gestureState.value.isActive = false;
  
  // Réinitialiser la transformation et retirer la classe swiping
  if (containerRef.value) {
    containerRef.value.style.transform = '';
    containerRef.value.classList.remove('swiping');
  }
};

// Navigation entre les mois
const navigateMonth = async (direction) => {
  if (isAnimating.value) return;
  
  isAnimating.value = true;
  
  if (direction === 1) {
    // Swipe vers la gauche (mois suivant)
    currentWindow.value = 2;
    await nextTick();
    
    setTimeout(() => {
      currentWindow.value = 1;
      currentMonth.value = (currentMonth.value + 1) % 12;
      if (currentMonth.value === 0) {
        currentYear.value++;
      }
      emit('swipe-left');
      isAnimating.value = false;
    }, 300);
  } else {
    // Swipe vers la droite (mois précédent)
    currentWindow.value = 0;
    await nextTick();
    
    setTimeout(() => {
      currentWindow.value = 1;
      currentMonth.value = (currentMonth.value - 1 + 12) % 12;
      if (currentMonth.value === 11) {
        currentYear.value--;
      }
      emit('swipe-right');
      isAnimating.value = false;
    }, 300);
  }
};
</script>

<style scoped>
.calendar-swipe-container {
  position: relative;
  overflow: hidden;
  width: 100%;
  user-select: none;
}

.calendar-windows-container {
  position: relative;
  left: -100%;
  display: flex;
  width: 300%;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

.calendar-window {
  width: 33.333%;
  flex-shrink: 0;
  opacity: 0.3;
  transition: opacity 0.3s ease-in-out;
  transform: scale(0.95);
}

.calendar-window.active {
  opacity: 1;
  transform: scale(1);
}




/* Styles pour le touch */
.calendar-windows-container {
  touch-action: pan-y pinch-zoom;
}

/* Animation de transition pour les fenêtres */
.calendar-window {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Effet de feedback visuel pendant le swipe */
.calendar-windows-container.swiping {
  transition: none;
}



</style> 