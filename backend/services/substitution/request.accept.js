import { sendAcceptedDemandEmail } from '../email/userPoolNotificationEmail.js';
import { AppError } from '../../error/appError.js';
import mongoose from 'mongoose';
import { acceptRequestWithSession } from './request.internal.js';


/**
 * Accepte une demande de substitution ou un échange de vacations
 * @param {string} requestId
 * @param {string} userId
 * @param {Object} opts
 * @param {boolean} opts.isSwitch - true for shift swap, false for substitution
 */
export async function acceptRequest (requestId, userId, { isSwitch = false } = {}) {
    const session = await mongoose.startSession();
    let request, accepterShift, acceptedShiftPoints, userShiftData;

    try {
        await session.withTransaction(async () => {
            ({ request, accepterShift, acceptedShiftPoints, userShiftData } =
                await acceptRequestWithSession(requestId, userId, { session, isSwitch }));
        });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(`Erreur lors de l'acceptation de la ${isSwitch ? 'permutation' : 'demande'}` + error, 500);
    } finally {
        session.endSession();
    }

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
