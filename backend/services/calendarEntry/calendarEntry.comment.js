/**
 * Note d'un jour du calendrier (`DayComment`) : un commentaire libre, indépendant de la vacation et de toute entrée du jour.
 * Elle n'est pas une entrée de calendrier : les annulations, le retour à la vacation initiale et le nettoyage d'une période ne la
 * touchent pas, et elle ne gêne aucune modification.
 */
import DayComment from '../../models/DayComment.js';
import { Assignment } from '../../models/CalendarEntry.js';
import { normalizeComment } from '../../utils/validation.js';
import { computeUserShifts } from '../planning/planning.userShifts.js';

/**
 * Enregistre, remplace ou supprime (commentaire vide) la note d'un jour de l'utilisateur, et renvoie la vacation recalculée du jour.
 *
 * Le commentaire qu'une affectation porte déjà (saisi avec elle) s'affiche quand il n'y a pas de note ; pour qu'une suppression
 * supprime bien ce qui est affiché, elle vide aussi ce commentaire-là, en place (l'affectation, elle, n'est pas touchée).
 * @param {string} userId
 * @param {string} date - jour `YYYY-MM-DD`
 * @param {string} rawComment
 */
export async function setDayComment (userId, date, rawComment) {
    const comment = normalizeComment(rawComment);

    if (comment) {
        await DayComment.updateOne({ userId, date }, { $set: { comment } }, { upsert: true });
    } else {
        await DayComment.deleteOne({ userId, date });
        await Assignment.updateMany({ userId, date, active: true, comment: { $ne: '' } }, { $set: { comment: '' } });
    }

    const userShift = await computeUserShifts([date], userId);
    return { userShift, updatedDemands: null, type: 'comment' };
}
