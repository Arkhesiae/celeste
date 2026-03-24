import User from '../../models/User.js';
import Substitution from '../../models/Substitution.js';
import Transaction from '../../models/Transaction.js';
import * as scheduledTransactionService from '../transaction/scheduledTransactionService.js';
import { computeShiftOfUserWithSubstitutions } from '../../utils/computeShiftOfUserWithSubstitutions.js';
import { sendCancelledAcceptanceEmail, sendAcceptedDemandEmail } from '../email/userPoolNotificationEmail.js';
import * as calendarEntryService from '../calendarEntry/calendarEntryService.js';
import { categorizeDemands } from './demandService.js';
import { AppError } from '../../error/appError.js';




/**
 * Annule une demande de substitution
 * @param {string} demandId - ID de la demande à annuler
 * @returns {Promise<Object>} Demande annulée
 */
export async function cancelDemand (demandId) {
    // Mise à jour du statut de la demande
    const demand = await Substitution.findByIdAndUpdate(
        demandId,
        { status: 'canceled' },
        { new: true }
    );

    if (!demand) {
        throw new AppError('Demande non trouvée', 404);
    }

    const childDemands = await Substitution.find({ dependsOn: demandId });
    await Promise.all(childDemands.map(childDemand => cancelDemand(childDemand._id)));

    // Annuler toutes les transactions associées à la demande

    const transactions = await Transaction.find({ request: demandId, status: 'pending' });
    if (transactions.length > 0) {
        await Promise.all(transactions.map(async (transaction) => {
            try {
                await scheduledTransactionService.cancelDelayedTransaction(transaction._id);
            } catch (error) {
                console.error(`Erreur lors de l'annulation de la transaction ${transaction._id}:`, error);
                // On continue même si une transaction échoue à être annulée
            }
        }));
    }

    await calendarEntryService.restoreBeforeSubstitution(demandId);

    const shift = await computeShiftOfUserWithSubstitutions(new Date(demand.posterShift.date), demand.posterId);

    return { demand: demand, shift: shift[0] };
}


/**
 * Supprime définitivement une demande de substitution
 * @param {string} demandId - ID de la demande à supprimer
 * @returns {Promise<Object>} Demande supprimée
 */
export async function deleteDemand (demandId) {
    const demand = await Substitution.findByIdAndUpdate(demandId, { deleted: true }, { new: true });

    if (!demand) {
        throw new AppError('Demande non trouvée', 404);
    }

    // Annuler toutes les transactions associées à la demande

    const transactions = await Transaction.find({ request: demandId, status: 'pending' });
    if (transactions.length > 0) {
        await Promise.all(transactions.map(async (transaction) => {
            try {
                await scheduledTransactionService.cancelDelayedTransaction(transaction._id);
            } catch (error) {
                console.error(`Erreur lors de l'annulation de la transaction ${transaction._id}:`, error);
                // On continue même si une transaction échoue à être annulée
            }
        }));
    }


    return demand;
}


/**
 * Annule l'acceptation d'une demande de substitution
 * @param {string} demandId - ID de la demande
 * @param {string} userId - ID de l'utilisateur qui annule l'acceptation
 * @returns {Promise<Object>} Demande avec acceptation annulée
 */
export async function withdrawFromDemand (demandId, userId) {
    // Récupération de la demande
    const request = await Substitution.findById(demandId);
    if (!request) {
        throw new AppError('Demande non trouvée', 404);
    }

    // Vérification que la demande est acceptée
    if (request.status !== 'accepted') {
        throw new AppError('Cette demande n\'est pas acceptée', 400);
    }

    // Vérification que l'utilisateur est bien celui qui a accepté
    if (request.accepterId.toString() !== userId) {
        throw new AppError('Vous n\'êtes pas autorisé à annuler cette acceptation', 403);
    }

    // Annuler toutes les transactions associées à la demande

    const transactions = await Transaction.find({ request: demandId, status: 'pending' });
    if (transactions.length > 0) {
        await Promise.all(transactions.map(async (transaction) => {
            try {
                await scheduledTransactionService.cancelDelayedTransaction(transaction._id);
            } catch (error) {
                console.error(`Erreur lors de l'annulation de la transaction ${transaction._id}:`, error);
                // On continue même si une transaction échoue à être annulée
            }
        }));
    }

    await calendarEntryService.restoreBeforeSubstitution(demandId);

    // Mise à jour de la demande
    const updatedRequest = await Substitution.findByIdAndUpdate(
        demandId,
        {
            accepterShift: null,
            accepterId: null,
            status: 'open',
            updatedAt: new Date()
        },
        { new: true }
    ).populate([
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' }
    ]);


    const shift = await computeShiftOfUserWithSubstitutions(new Date(updatedRequest.posterShift.date), userId);
    const categorizedRequest = await categorizeDemands([updatedRequest], userId);

    try {
        const populatedDemand = await Substitution.findById(categorizedRequest[0]._id).populate([
            { path: 'posterId', select: 'name lastName email' },
            { path: 'posterShift.shift', select: 'name' }
        ]);
        const originalAccepter = await User.findById(userId);
        sendCancelledAcceptanceEmail(populatedDemand, originalAccepter)
            .then(results => {
                console.log(`📧 Notifications envoyées avec succès:`, {
                    demandId: categorizedRequest[0]._id,
                    totalSent: results.sent,
                    totalFailed: results.failed
                });
            })
            .catch(error => {
                console.error('❌ Erreur lors de l\'envoi des notifications:', error);
            });
    } catch (emailError) {
        console.error('❌ Erreur lors de la préparation des notifications:', emailError);
    }

    return { categorizedRequest: categorizedRequest[0], shift: shift[0] };
}


export async function acceptDemand (demandId, userId) {
    const updatedDemand = await Substitution.findOneAndUpdate(
        { _id: demandId, status: 'open' },
        { accepterId: userId, status: 'accepted' },
        { new: true, timestamps: true }
    ).populate([
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' },
        { path: 'posterShift.teamId', select: 'name' },
    ]);

    if (!updatedDemand) {
        throw new AppError('Cette demande n\'est plus disponible', 400);
    }

    if (updatedDemand.posterId.toString() === userId) {
        await Substitution.findByIdAndUpdate(demandId, { status: 'open', accepterId: null });
        throw new AppError('Vous ne pouvez pas accepter votre propre demande', 400);
    }

    try {
        if (updatedDemand.points > 0) {
            await scheduledTransactionService.createDelayedTransaction({
                sender: updatedDemand.posterId,
                receiver: userId,
                amount: updatedDemand.points,
                type: 'replacement',
                request: demandId,
                description: `Remplacement du ${new Date(updatedDemand.posterShift.date).toLocaleDateString('fr-FR')}`,
                scheduledDate: new Date(updatedDemand.posterShift.date)
            });
        }

        await calendarEntryService.addSubstitutionEntries(updatedDemand);

        const shift = await computeShiftOfUserWithSubstitutions(
            new Date(updatedDemand.posterShift.date),
            userId
        );

        const result = updatedDemand.toObject();

        await updatedDemand.populate([
            { path: 'posterId', select: 'name lastName email' },
            { path: 'accepterId', select: 'name lastName email' },
        ]);

        sendAcceptedDemandEmail(updatedDemand).then(results => {
            console.log(`📧 Notifications envoyées avec succès:`, {
                demandId: updatedDemand._id,
                totalSent: results.sent,
                totalFailed: results.failed
            });
        })
            .catch(err =>
                console.error('❌ Erreur notification:', err)
            );

        return { request: result, shift: shift[0] };

    } catch (err) {
        console.log(err);
        await Substitution.findByIdAndUpdate(demandId, { status: 'open', accepterId: null });
        throw new AppError('Erreur lors de l\'acceptation de la demande', 500);
    }
}

export const swapShifts = async (demandId, userId) => {
    const demand = await Substitution.findById(demandId);
    if (!demand) {
        throw new AppError('Demande non trouvée', 404);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }

    if (demand.status !== 'open') {
        throw new AppError('Cette demande n\'est plus disponible', 400);
    }

    if (demand.posterId.toString() === userId) {
        throw new AppError('Vous ne pouvez pas accepter votre propre demande', 400);
    }

    const userShift = await computeShiftOfUserWithSubstitutions(new Date(demand.posterShift.date), userId);
    if (!userShift?.length) {
        throw new AppError('Vacation utilisateur non trouvée', 404);
    }

    const acceptedShiftData = demand.acceptedSwitches.find(
        s => s.shift.toString() === userShift[0].shift._id.toString()
    );
    if (!acceptedShiftData) {
        throw new AppError('Votre vacation n\'est pas acceptée pour cet échange', 400);
    }

    const { points: acceptedShiftPoints } = acceptedShiftData;

    if (acceptedShiftPoints > 0 && user.points + acceptedShiftPoints > MAX_POINTS_TO_ACCEPT_REQUEST) {
        throw new AppError('Vous ne pouvez pas accepter cette demande, vous avez déjà assez de points', 400);
    }

    const accepterShift = {
        shift: userShift[0].shift._id,
        teamId: userShift[0].teamObject._id,
        selectedVariation: null
    };

    const updatedDemand = await Substitution.findByIdAndUpdate(
        demandId,
        { accepterId: userId, status: 'accepted', updatedAt: new Date(), accepterShift },
        { new: true }
    ).populate('posterShift.shift');

    if (acceptedShiftPoints > 0) {
        await scheduledTransactionService.createDelayedTransaction({
            sender: demand.posterId,
            receiver: userId,
            amount: acceptedShiftPoints,
            type: 'replacement',
            request: demandId,
            description: `Permutation du ${new Date(demand.posterShift.date).toLocaleDateString('fr-FR')}`,
            scheduledDate: new Date(demand.posterShift.date)
        });
    }

    const shift = await computeShiftOfUserWithSubstitutions(new Date(demand.posterShift.date), userId);

    // Email en arrière-plan, non bloquant
    Substitution.findById(updatedDemand._id).populate([
        { path: 'posterId', select: 'name lastName email' },
        { path: 'accepterId', select: 'name lastName email' },
        { path: 'posterShift.shift', select: 'name' },
        { path: 'accepterShift.shift', select: 'name' },
        { path: 'accepterShift.teamId', select: 'name' }
    ])
        .then(populatedDemand => sendAcceptedDemandEmail(populatedDemand))
        .then(results => console.log(`📧 Notifications envoyées:`, results))
        .catch(error => console.error('❌ Erreur notifications:', error));

    return { demand: updatedDemand, acceptedShiftPoints, shift: shift[0] };
};