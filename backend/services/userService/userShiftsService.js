import { generateDateArray } from "../../utils/generateDateArray.js";
import { computeShiftOfUserWithSubstitutions } from "../../utils/computeShiftOfUserWithSubstitutions.js";
import Shift from "../../models/Shift.js";

/**
 * S'assure que le shift a ses variations peuplées (documents complets avec name, startTime, endTime).
 * En base, variations = [ObjectId, ...]. Il faut populate pour avoir les infos affichables.
 */
const ensureShiftWithVariations = async (shift) => {
    if (!shift) return null;
    const obj = shift?.toObject ? shift.toObject() : shift;
    if (!obj?._id) return obj;
    // Toujours charger depuis la DB pour avoir les variations peuplées (name, startTime, endTime)
    const populated = await Shift.findById(obj._id).populate('variations').lean();
    if (!populated) return obj;
    return {
        ...obj,
        variations: populated.variations || [],
        default: populated.default || obj.default
    };
};

/**
 * Récupère les shifts d'un utilisateur
 * @param {Object} dates - Les dates de début et de fin
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<Array>} - Un tableau des shifts de l'utilisateur
 */
const getUserShifts = async (dates, userId) => {
    try {
        const dateArray = generateDateArray(dates.startDate, dates.endDate);
        const results = await computeShiftOfUserWithSubstitutions(dateArray, userId);
        return Promise.all(results.map(async (r) => ({
            ...r,
            shift: await ensureShiftWithVariations(r.shift),
            initialShift: r.initialShift?.toObject ? r.initialShift.toObject() : r.initialShift
        })));
    } catch (error) {
        console.error('Erreur lors de la récupération des vacations de l\'utilisateur : ', error.message);
        throw error;
    }
}

export { getUserShifts }