/**
 * Lecture des entrées de calendrier d'un utilisateur.
 */
import { CalendarEntry } from '../../models/CalendarEntry.js';

/**
 * Récupère l'historique des entrées d'un utilisateur (actives ou non), avec filtre optionnel sur un jour.
 * @param {string} userId
 * @param {string} [date] - jour `YYYY-MM-DD` (le champ `date` des entrées est une chaîne, pas un `Date`)
 */
export async function getUserEntries (userId, date) {
    const query = { userId };

    if (date) {
        query.date = date;
    }

    return CalendarEntry.find(query)
        .populate('userId', 'name lastName email')
        .populate('centerId', 'name')
        .populate({ path: 'shiftData.shift' })
        .populate({ path: 'shiftData.selectedVariation' })
        .sort({ date: 1, createdAt: -1 });
}
