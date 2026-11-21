import Demand from '../../models/Demand.js';
import { toDay } from '../../utils/dates/dayFields.js';
import { dayFilter } from '../../utils/dates/dayAccess.js';
import { findOrThrow } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import User from '../../models/User.js';
import { AppError } from '../../error/AppError.js';
import { generateMapFromDemands } from '../planning/planning.shiftsMap.js';
import { categorizeWithVariations } from './compatibility/compatibility.variations.js';
import { getUserTimeZone } from '../center/center.timezone.js';


/** Vacations d'une demande, chargées avec elle pour l'affichage */
const DEMAND_POPULATE = [
    { path: 'posterShift.shift', populate: { path: 'variations' } },
    { path: 'posterShift.selectedVariation' },
    { path: 'posterShift.teamId' },
    { path: 'accepterShift.shift', populate: { path: 'variations' } },
    { path: 'accepterShift.selectedVariation' },
    { path: 'accepterShift.teamId' },
    { path: 'acceptedSwitches.shift', select: '_id name' },
];

/**
 * Une demande avec ses vacations : sert à afficher la demande dont une autre dépend (`dependsOn`). Le centre est contrôlé par la route.
 * @param {string} demandId
 */
export async function getDemandById (demandId) {
    const demand = await Demand.findOne({ _id: demandId, deleted: false }).populate(DEMAND_POPULATE);
    if (!demand) throw new AppError('Demande introuvable', 404);
    return demand.toObject();
}

/**
 * Récupère les demandes d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} startDateStr - Date de début
 * @param {string} endDateStr - Date de fin
 * @returns {Promise<Array<Object>>} Liste des demandes
 */
export async function getDemands (userId, startDateStr, endDateStr) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé', select: 'centerId' });

    const baseFilter = {
        centerId: user.centerId,
        deleted: false,
        status: { $in: ['open', 'accepted'] },
        ...dayFilter('posterShift.day', 'posterShift.date', { gte: toDay(startDateStr), lte: toDay(endDateStr) })
    };

    const options = DEMAND_POPULATE;

    const [otherDemands, myDemands] = await Promise.all([
        Demand.find({
            ...baseFilter,
            posterId: { $ne: user._id },
        }).populate(options),
        Demand.find({
            ...baseFilter,
            posterId: user._id,
        }).populate(options),
    ]);

    Demand.updateMany(
        { _id: { $in: otherDemands.map((d) => d._id) }, seenBy: { $ne: userId } },
        { $addToSet: { seenBy: userId } }
    ).catch((err) => console.error('❌ Erreur seenBy update:', err));

    let result;
    let success = true;

    try {
        result = await categorizeDemands(otherDemands, userId);
    } catch (error) {
        result = otherDemands;
        success = false;
        console.error('❌ Erreur categorization:', error);
    }

    const withIsNew = (demand) => {
        const obj = demand.toObject ? demand.toObject() : demand;
        return {
            ...obj,
            isNew: !obj.consultedBy?.some((id) => sameId(id, userId))
        };
    };

    return [
        ...result.map(withIsNew),
        ...myDemands.map(withIsNew),
    ];
};


/**
 * Catégorise les demandes d'un utilisateur
 * @param {Array<Object>} demands - Liste des demandes avec posterShift, selectedVariation, accepterShift et teamObject
 * @param {string} userId - ID de l'utilisateur à analyser
 * @returns {Promise<Array<Object>>} Liste des demandes catégorisées
 */
export async function categorizeDemands (demands, userId) {
    const openDemands = demands.filter((d) => d.status === 'open');

    if (!openDemands.length) return demands;

    const shiftsMap = await generateMapFromDemands(openDemands, userId);
    // Le planning est celui de l'utilisateur : ses vacations sont dans le fuseau de son centre
    const timeZone = await getUserTimeZone(userId);

    return Promise.all(
        demands.map((demand) =>
            demand.status === 'open' ? categorizeWithVariations(demand, shiftsMap, { timeZone }) : demand
        )
    );
}


/**
 * Recatégorise les demandes pour un utilisateur
 * @param {Array<string>} demandIds - Liste des IDs des demandes à recatégoriser
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array<Object>>} Liste des demandes recatégorisées
 */
export async function recategorizeDemands (demandIds, userId) {
    if (!userId || !demandIds?.length) {
        throw new AppError('Paramètres manquants', 400);
    }
    
    // Récupérer les demandes avec leurs shifts populés
    const demands = await Demand.find({ _id: { $in: demandIds } }).populate([
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' },
        { path: 'acceptedSwitches.shift', select: '_id name' }
    ]);

    if (demands.length === 0) {
        throw new AppError('Aucune demande trouvée', 404);
    }

    // Recatégoriser les demandes
    let result;
    let success = true;

    try {
        result = await categorizeDemands(demands, userId);
    } catch (error) {
        result = demands;
        success = false;
        console.error('❌ Erreur categorization:', error);
    }


    return result;
}