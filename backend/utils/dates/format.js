import { toCalendarDay } from './calendarDay.js';
import { DEFAULT_TIME_ZONE } from './constants.js';

/**
 * Date lisible en français pour les emails et les messages.
 *
 * Un jour stocké (Date à minuit UTC, YYYY-MM-DD) s'affiche tel quel ; un instant (horodatage de création...) est placé
 * dans le fuseau du centre avant d'être formaté : l'affichage ne dépend jamais du fuseau du serveur.
 *
 * @param {Date|string} value
 * @param {Object} [opts]
 * @param {string} [opts.timeZone] - fuseau IANA du centre
 * @param {boolean} [opts.short=false] - `08/11/2026` au lieu de `dimanche 8 novembre 2026`
 * @returns {string} chaîne vide si la valeur n'est pas une date
 */
export function formatDateFr (value, { timeZone = DEFAULT_TIME_ZONE, short = false } = {}) {
    const day = toCalendarDay(value, timeZone);
    if (!day) return '';
    return day.toLocaleString('fr-FR', short
        ? undefined
        : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
