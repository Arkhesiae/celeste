import Substitution from '../../models/Substitution.js';
import User from '../../models/User.js';
import { AppError } from '../../error/AppError.js';
import { generateMapFromDemands } from '../../utils/generateShiftsMap.js';
import { categorize } from '../../utils/categorizeDemand.js';


/**
 * Récupère les demandes d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} startDateStr - Date de début
 * @param {string} endDateStr - Date de fin
 * @returns {Promise<Array<Object>>} Liste des demandes
 */
export async function getRequests (userId, startDateStr, endDateStr) {
    const user = await User.findById(userId).select('centerId');
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }
    let parsedStartDate, parsedEndDate;

    parsedStartDate = new Date(startDateStr);
    parsedEndDate = new Date(endDateStr);


    const baseFilter = {
        centerId: user.centerId,
        deleted: false,
        status: { $in: ['open', 'accepted'] },
        'posterShift.date': { $gte: parsedStartDate, $lte: parsedEndDate }
    };

    const options = [
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' },
        { path: 'posterShift.teamId' },
        { path: 'accepterShift.shift', populate: { path: 'variations' } },
        { path: 'accepterShift.selectedVariation' },
        { path: 'accepterShift.teamId' },
        { path: 'acceptedSwitches.shift', select: '_id name' },
    ];

    const [otherRequests, myRequests] = await Promise.all([
        Substitution.find({
            ...baseFilter,
            posterId: { $ne: user._id },
        }).populate(options),
        Substitution.find({
            ...baseFilter,
            posterId: user._id,
        }).populate(options),
    ]);

    Substitution.updateMany(
        { _id: { $in: otherRequests.map((d) => d._id) }, seenBy: { $ne: userId } },
        { $addToSet: { seenBy: userId } }
    ).catch((err) => console.error('❌ Erreur seenBy update:', err));

    const categorizedOtherRequests = await categorizeRequests(otherRequests, userId);

    const withIsNew = (request) => {
        const obj = request.toObject ? request.toObject() : request;
        return {
            ...obj,
            isNew: !obj.consultedBy?.some((id) => id.toString() === userId.toString())
        };
    };

    return [
        ...categorizedOtherRequests.map(withIsNew),
        ...myRequests.map(withIsNew),
    ];
};


/**
 * Catégorise les demandes d'un utilisateur
 * @param {Array<Object>} requests - Liste des demandes avec posterShift, selectedVariation, accepterShift et teamObject
 * @param {string} userId - ID de l'utilisateur à analyser
 * @returns {Promise<Array<Object>>} Liste des demandes catégorisées
 */
export async function categorizeRequests (requests, userId) {
    const openRequests = requests.filter((d) => d.status === 'open');

    if (!openRequests.length) return requests;

    const shiftsMap = await generateMapFromDemands(openRequests, userId);

    return Promise.all(
        requests.map((request) =>
            request.status === 'open' ? categorize(request, shiftsMap) : request
        )
    );
}


/**
 * Recatégorise les substitutions pour un utilisateur
 * @param {Array<string>} substitutionIds - Liste des IDs des substitutions à recatégoriser
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array<Object>>} Liste des substitutions recatégorisées
 */
export async function recategorizeSubstitutions (substitutionIds, userId) {
    if (!userId || !substitutionIds) {
        throw new AppError('Paramètres manquants', 400);
    }

    // Récupérer les substitutions avec leurs shifts populés
    const substitutions = await Substitution.find({ _id: { $in: substitutionIds } }).populate([
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' },
        { path: 'acceptedSwitches.shift', select: '_id name' }
    ]);

    if (substitutions.length === 0) {
        throw new AppError('Aucune substitution trouvée', 404);
    }

    // Recatégoriser les substitutions
    const categorizedSubstitutions = await categorizeRequests(substitutions, userId);

    return categorizedSubstitutions;
}