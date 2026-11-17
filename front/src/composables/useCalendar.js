import { Temporal } from '@js-temporal/polyfill';

const groupDaysByWeeks = (days) => {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
};

/** Grille d'un mois : des semaines complètes (lundi à dimanche) avec les jours voisins marqués `isInMonth: false` */
const buildMonthGrid = (year, month) => {
  const firstDayOfMonth = Temporal.PlainDate.from({ year, month, day: 1 });
  const lastDayOfMonth = firstDayOfMonth.with({ day: firstDayOfMonth.daysInMonth });

  // Temporal: dayOfWeek is 1 (Mon)–7 (Sun), we want 0 (Mon)–6 (Sun)
  const firstDayWeekday = firstDayOfMonth.dayOfWeek - 1;

  const leadingDays = Array.from({ length: firstDayWeekday }, (_, i) => ({
    date: firstDayOfMonth.subtract({ days: firstDayWeekday - i }),
    isInMonth: false,
  }));

  const currentMonthDays = Array.from({ length: lastDayOfMonth.day }, (_, i) => ({
    date: firstDayOfMonth.add({ days: i }),
    isInMonth: true,
  }));

  const trailingDaysCount = (7 - ((leadingDays.length + lastDayOfMonth.day) % 7)) % 7;
  const trailingDays = Array.from({ length: trailingDaysCount }, (_, i) => ({
    date: lastDayOfMonth.add({ days: i + 1 }),
    isInMonth: false,
  }));

  return groupDaysByWeeks([...leadingDays, ...currentMonthDays, ...trailingDays]);
};

export function useCalendar(selectedYear, selectedMonth) {
  const calendarDays = computed(() => buildMonthGrid(selectedYear.value, selectedMonth.value));

  // Mois voisins, pour le glissement du calendrier mobile (le mois d'après n'est pas calculé tant que personne ne le lit)
  const neighborGrid = (months) => {
    const month = Temporal.PlainDate.from({ year: selectedYear.value, month: selectedMonth.value, day: 1 }).add({ months });
    return buildMonthGrid(month.year, month.month);
  };
  const previousDays = computed(() => neighborGrid(-1));
  const nextDays = computed(() => neighborGrid(1));

  return { calendarDays, previousDays, nextDays };
}
