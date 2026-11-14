import { Temporal } from '@js-temporal/polyfill';

/**
 * Données d'exemple pour voir les indicateurs du calendrier (développement uniquement : `?workDemo=1` sur la page du
 * calendrier). Une rotation conforme ne produit aucune alerte ; ce jeu y ajoute, à partir du début de la période affichée :
 * un repos insuffisant, un dépassement de 48 h sur deux périodes qui se suivent, et deux périodes sans repos de 35 h.
 * Les valeurs réelles du serveur sont conservées partout ailleurs.
 *
 * @param {{ days: Array, windows: Array, limits: Object }} real - réponse du serveur
 * @returns {Object} une copie modifiée
 */
export function withDemoIssues (real) {
  const from = Temporal.PlainDate.from(real.period.from);
  const at = (offset) => from.add({ days: offset }).toString();
  const days = real.days.map((day) => ({ ...day }));
  const windows = real.windows.map((window) => ({ ...window }));

  // Repos de 8 h 30 avant la vacation du 4e jour (11 h exigées)
  const restDay = days.find((day) => day.date === at(3));
  if (restDay) {
    restDay.workedMinutes = restDay.workedMinutes || 8 * 60;
    restDay.rest = { minutes: 8 * 60 + 30, requiredMinutes: 11 * 60, ok: false, from: `${at(2)}T22:00`, to: `${at(3)}T06:30` };
  }

  const patch = (start, changes) => {
    const window = windows.find((candidate) => candidate.start === start);
    if (window) Object.assign(window, changes);
  };
  // Deux périodes qui se suivent au-dessus de 48 h : une seule ligne plus longue
  patch(at(5), { workMinutes: 52 * 60 + 30, workOk: false });
  patch(at(6), { workMinutes: 50 * 60, workOk: false });
  // Deux périodes sans repos de 35 h (plus long repos : 28 h puis 30 h 30)
  patch(at(15), { longestRestMinutes: 28 * 60, longestRestFrom: `${at(18)}T20:00`, longestRestTo: `${at(19)}T23:59`, restOk: false });
  patch(at(16), { longestRestMinutes: 30 * 60 + 30, longestRestFrom: `${at(18)}T20:00`, longestRestTo: `${at(20)}T02:30`, restOk: false });

  return { ...real, days, windows };
}
