import { sendAcceptedDemandEmail } from '../email/demand/demandEmails.js';
import { inTransaction } from '../../utils/mongo.js';
import { AppError } from '../../error/AppError.js';
import { acceptRequestWithSession } from './request.internal.js';
import { computeUserShifts } from '../planning/computeUserShifts.js';
import { posterDayOf } from '../../utils/dates/dayAccess.js';


/**
 * Accepte une demande de substitution ou un échange de vacations
 * @param {string} requestId
 * @param {string} userId
 * @param {Object} opts
 * @param {boolean} opts.isSwitch - true for shift swap, false for substitution
 */
export async function acceptRequest (requestId, userId, { isSwitch = false } = {}) {
    let request, acceptedShiftPoints, userShiftData;

    try {
        await inTransaction(async (session) => {
            ({ request, acceptedShiftPoints, userShiftData } =
                await acceptRequestWithSession(requestId, userId, { session, isSwitch }));
        });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(`Erreur lors de l'acceptation de la ${isSwitch ? 'permutation' : 'demande'}` + error, 500);
    }

    // Post-transaction : vacation de l'accepteur ce jour-là, avec les entrées de calendrier qui viennent d'être validées
    // (une substitution ; pour une permutation, la vacation est celle de `userShiftData`)
    const accepterShift = isSwitch ? null : (await computeUserShifts([posterDayOf(request)], userId))[0];

    // Post-transaction: populate for return value
    await request.populate([
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' },
        { path: 'posterShift.teamId', select: 'name' },
        ...(isSwitch ? [
            { path: 'accepterShift.shift', populate: { path: 'variations' } },
            { path: 'accepterShift.selectedVariation' },
            { path: 'accepterShift.teamId', select: 'name' },
        ] : []),
    ]);

    const result = request.toObject();

    // Populate for email only
    await request.populate([
        { path: 'posterId', select: 'name lastName email' },
        { path: 'accepterId', select: 'name lastName email' },
    ]);

    sendAcceptedDemandEmail(request)
        .then(({ sent, failed }) =>
            console.log('📧 Notifications envoyées:', { requestId: request._id, sent, failed })
        )
        .catch((err) => console.error('❌ Erreur notification:', err));

    return isSwitch
        ? { request: result, acceptedShiftPoints, shift: userShiftData }
        : { request: result, shift: accepterShift };
}

export const acceptDemand = (requestId, userId) => acceptRequest(requestId, userId, { isSwitch: false });
export const swapShifts = async (requestId, userId) => {
    const res = await acceptRequest(requestId, userId, { isSwitch: true });
    return { demand: res.request, acceptedShiftPoints: res.acceptedShiftPoints, shift: res.shift };
};
