import { computed } from 'vue';

/**
 * Regroupe un tableau de jours en semaines.
 */
const groupDaysByWeeks = (days) => {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
};

export function useCalendar(selectedYear, selectedMonth) {
  const calendarDays = computed(() => {
    const firstDayOfMonth = new Date(Date.UTC(selectedYear.value, selectedMonth.value, 1));
    const lastDayOfMonth = new Date(Date.UTC(selectedYear.value, selectedMonth.value + 1, 0));
    const firstDayWeekday = (firstDayOfMonth.getUTCDay() + 6) % 7;
    const prevMonthLastDay = new Date(Date.UTC(selectedYear.value, selectedMonth.value, 0)).getUTCDate();

    const leadingDays = Array.from({ length: firstDayWeekday }, (_, i) => ({
      date: new Date(Date.UTC(selectedYear.value, selectedMonth.value - 1, prevMonthLastDay - firstDayWeekday + i + 1)),
      isInMonth: false,
    }));

    const currentMonthDays = Array.from({ length: lastDayOfMonth.getUTCDate() }, (_, i) => ({
      date: new Date(Date.UTC(selectedYear.value, selectedMonth.value, i + 1)),
      isInMonth: true,
    }));

    const trailingDaysCount = (7 - ((leadingDays.length + lastDayOfMonth.getUTCDate()) % 7)) % 7;
    const trailingDays = Array.from({ length: trailingDaysCount }, (_, i) => ({
      date: new Date(Date.UTC(selectedYear.value, selectedMonth.value + 1, i + 1)),
      isInMonth: false,
    }));

    return groupDaysByWeeks([...leadingDays, ...currentMonthDays, ...trailingDays]);
  });

  return { calendarDays };
}
