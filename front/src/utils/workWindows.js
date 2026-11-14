import { Temporal } from '@js-temporal/polyfill';

/**
 * Aides d'affichage du contrôle du temps de travail (calendrier) : ne contient aucune règle, seulement la mise en forme et
 * la sélection des résultats du serveur (`GET /api/user/:id/work-check`, voir backend/services/user/user.workCheck.js).
 *
 * Une « période » (window) est une période de 7 jours glissante : { start, end (jours YYYY-MM-DD), workMinutes,
 * longestRestMinutes, longestRestFrom, longestRestTo (date et heure locales du centre), workOk, restOk }.
 */

/** Minutes → « 7 h 45 », « 8 h », « 35 h » */
export function formatHours (minutes) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
}

/** Minutes → « 7h45 », « 8h », « 10h30 » : la forme courte des tuiles du calendrier, où la place manque */
export function formatCompactHours (minutes) {
  const total = Math.max(0, Math.round(minutes));
  const rest = total % 60;
  return `${Math.floor(total / 60)}h${rest ? String(rest).padStart(2, '0') : ''}`;
}

const dayKeys = (from, to) => {
  const keys = [];
  for (let day = Temporal.PlainDate.from(from); Temporal.PlainDate.compare(day, to) <= 0; day = day.add({ days: 1 })) {
    keys.push(day.toString());
  }
  return keys;
};

/** Les deux jours d'une sélection dans l'ordre chronologique */
export function orderedPeriod (a, b) {
  return Temporal.PlainDate.compare(a, b) <= 0 ? { start: a, end: b } : { start: b, end: a };
}

/** Nombre de jours d'une période, bornes comprises */
export function daysInPeriod (start, end) {
  return Temporal.PlainDate.from(start).until(Temporal.PlainDate.from(end), { largestUnit: 'days' }).days + 1;
}

/**
 * Ce que le calendrier dessine sous chaque jour : une ligne par problème (`work` : plus de 48 h de travail, `rest` : pas de
 * repos continu de 35 h). Une ligne couvre l'ensemble des périodes de 7 jours en défaut pour ce problème : une période isolée
 * donne une ligne de 7 jours exactement, plusieurs périodes qui se suivent donnent une ligne plus longue.
 *
 * @param {Array} windows
 * @returns {Map<string, Array<{ issue: 'work'|'rest', capStart: boolean, capEnd: boolean, windows: string[] }>>}
 *   par jour : les lignes qui le traversent ; `capStart` / `capEnd` : la ligne commence / finit ce jour-là ;
 *   `windows` : débuts des périodes en défaut qui contiennent ce jour (la première sert à l'inspecter)
 */
export function buildWindowLines (windows) {
  const lines = new Map();
  for (const issue of ['work', 'rest']) {
    const failing = windows.filter((window) => (issue === 'work' ? !window.workOk : !window.restOk));
    const covering = new Map();   // jour → débuts des périodes en défaut qui le contiennent
    for (const window of failing) {
      for (const day of dayKeys(window.start, window.end)) {
        if (!covering.has(day)) covering.set(day, []);
        covering.get(day).push(window.start);
      }
    }
    for (const [day, starts] of covering) {
      const plain = Temporal.PlainDate.from(day);
      if (!lines.has(day)) lines.set(day, []);
      lines.get(day).push({
        issue,
        capStart: !covering.has(plain.subtract({ days: 1 }).toString()),
        capEnd: !covering.has(plain.add({ days: 1 }).toString()),
        windows: starts.sort(),
      });
    }
  }
  return lines;
}

/**
 * Périodes de 7 jours à contrôler pour une sélection de jours :
 *   - sélection de 7 jours ou moins : celles qui la contiennent en entier (7 pour un seul jour, une seule pour 7 jours) ;
 *   - sélection de plus de 7 jours : toutes celles qui tiennent dans la sélection.
 */
export function windowsForPeriod (windows, start, end) {
  const length = daysInPeriod(start, end);
  const first = length <= 7 ? Temporal.PlainDate.from(end).subtract({ days: 6 }) : Temporal.PlainDate.from(start);
  const last = length <= 7 ? Temporal.PlainDate.from(start) : Temporal.PlainDate.from(end).subtract({ days: 6 });
  return windows.filter((window) => {
    const windowStart = Temporal.PlainDate.from(window.start);
    return Temporal.PlainDate.compare(windowStart, first) >= 0 && Temporal.PlainDate.compare(windowStart, last) <= 0;
  });
}

/**
 * Verdict sur un ensemble de périodes : la règle des 35 h et celle des 48 h, chacune avec la période la plus défavorable.
 * @returns {{ evaluated: number, rest: { ok: boolean, worst: Object|null }, work: { ok: boolean, worst: Object|null } }}
 */
export function periodVerdict (windows) {
  const worstBy = (key, direction) => windows.reduce((worst, window) => (worst === null || direction * (window[key] - worst[key]) < 0 ? window : worst), null);
  const worstRest = worstBy('longestRestMinutes', 1);
  const worstWork = worstBy('workMinutes', -1);
  return {
    evaluated: windows.length,
    rest: { ok: windows.every((window) => window.restOk), worst: worstRest },
    work: { ok: windows.every((window) => window.workOk), worst: worstWork },
  };
}

/** La période de 7 jours qui commence à ce jour (undefined si le serveur ne l'a pas renvoyée) */
export const windowStartingAt = (windows, start) => windows.find((window) => window.start === start);

/** `lun. 8 mars` */
export function formatDayShort (day) {
  return Temporal.PlainDate.from(day).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** `8 → 14 mars` (ou `28 févr. → 6 mars` quand le mois change) */
export function formatDayRange (start, end) {
  const a = Temporal.PlainDate.from(start);
  const b = Temporal.PlainDate.from(end);
  const sameMonth = a.year === b.year && a.month === b.month;
  const first = a.toLocaleString('fr-FR', sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
  return `${first} → ${b.toLocaleString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

/** Heure d'une date-heure locale `2027-03-12T16:00` → « ven. 16:00 » */
export function formatLocalMoment (value) {
  if (!value) return '';
  const moment = Temporal.PlainDateTime.from(value);
  return `${moment.toPlainDate().toLocaleString('fr-FR', { weekday: 'short' })} ${String(moment.hour).padStart(2, '0')}:${String(moment.minute).padStart(2, '0')}`;
}

/**
 * Phrase qui explique une ligne du calendrier : la période en défaut, sa valeur et le seuil.
 * @param {Object} window - période de 7 jours
 * @param {'work'|'rest'} issue
 * @param {{ maxWeeklyWorkMinutes: number, weeklyRestMinutes: number }} limits
 * @param {number} [others] - nombre d'autres périodes en défaut sur la même ligne
 */
export function describeWindowIssue (window, issue, limits, others = 0) {
  const range = formatDayRange(window.start, window.end);
  const text = issue === 'work'
    ? `${range} : ${formatHours(window.workMinutes)} de travail sur 7 jours (maximum ${formatHours(limits.maxWeeklyWorkMinutes)})`
    : `${range} : repos continu le plus long de ${formatHours(window.longestRestMinutes)} sur 7 jours (minimum ${formatHours(limits.weeklyRestMinutes)})`;
  return others > 0 ? `${text}, et ${others} autre${others > 1 ? 's' : ''} période${others > 1 ? 's' : ''} voisine${others > 1 ? 's' : ''}` : text;
}
