export function useCalendarNavigation () {
  const today = Temporal.Now.plainDateISO();

  const currentMonth = ref(today.month); // 1-based
  const currentYear = ref(today.year);
  const selectedMonth = ref(today.month);
  const selectedYear = ref(today.year);

  const navigateMonth = (direction) => {
    const current = Temporal.PlainDate.from({
      year: selectedYear.value,
      month: selectedMonth.value,
      day: 1,
    });

    const next = current.add({ months: direction });

    selectedMonth.value = next.month;
    selectedYear.value = next.year;
  };

  const goToToday = () => {
    selectedMonth.value = currentMonth.value;
    selectedYear.value = currentYear.value;
  };


  

  return {
    selectedMonth,
    selectedYear,
    navigateMonth,
    goToToday,
  };
}