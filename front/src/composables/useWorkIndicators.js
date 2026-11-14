import { computed } from 'vue';
import { useWorkCheckStore } from '@/stores/workCheckStore';
import { buildWindowLines, describeWindowIssue, windowStartingAt } from '@/utils/workWindows';

/**
 * Ce que les grilles du calendrier (bureau et mobile) affichent du contrôle du temps de travail pour chaque jour : temps
 * travaillé, repos avant la vacation, lignes des périodes de 7 jours en défaut, et appartenance à la période choisie.
 *
 * @param {import('vue').Ref<{ start: string|null, end: string|null }|null>} periodRef - période choisie, ou null
 */
export function useWorkIndicators (periodRef) {
  const store = useWorkCheckStore();
  const lines = computed(() => buildWindowLines(store.windows));

  /** Résultat du serveur pour un jour (temps travaillé, repos avant la vacation), ou null */
  const workOf = (dateStr) => store.daysByDate[dateStr] ?? null;

  /** Lignes à tracer sous un jour, chacune avec sa phrase d'explication */
  const linesFor = (dateStr) => (lines.value.get(dateStr) ?? []).map((line) => {
    const first = windowStartingAt(store.windows, line.windows[0]);
    return {
      ...line,
      label: first && store.limits ? describeWindowIssue(first, line.issue, store.limits, line.windows.length - 1) : '',
    };
  });

  /** Jour strictement à l'intérieur de la période choisie (les deux bornes sont dessinées comme sélectionnées) */
  const inPeriod = (dateStr) => {
    const period = periodRef.value;
    return Boolean(period?.start && period?.end && dateStr > period.start && dateStr < period.end);
  };

  return { workOf, linesFor, inPeriod };
}
