import { ref, computed } from 'vue';
import { useDate } from 'vuetify';

export function useCalendarNavigation() {
  const date = useDate();
  const selectedDate = ref(null);
  const currentLocalDate = ref(new Date());
  const selectedMonth = ref(currentLocalDate.value.getMonth());
  const selectedYear = ref(currentLocalDate.value.getFullYear());

  const formattedDate = computed(() => 
    selectedDate.value ? date.format(selectedDate.value, "fullDate") : ''
  );

  const handleMonthUpdate = (month) => {
    selectedMonth.value = month;
  };

  const handleYearUpdate = (year) => {
    selectedYear.value = year;
  };

  const navigateMonth = (direction) => {
    let newMonth = selectedMonth.value + direction;
    let newYear = selectedYear.value;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    selectedMonth.value = newMonth;
    selectedYear.value = newYear;
  };

  const handleSwipeLeft = () => {
    navigateMonth(1);
  };

  const handleSwipeRight = () => {
    navigateMonth(-1);
  };

  return {
    selectedDate,
    formattedDate,
    currentLocalDate,
    selectedMonth,
    selectedYear,
    handleMonthUpdate,
    handleYearUpdate,
    navigateMonth,
    handleSwipeLeft,
    handleSwipeRight
  };
} 