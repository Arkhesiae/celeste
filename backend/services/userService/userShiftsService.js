import { generateDateArray } from "../../utils/generateDateArray.js";
import { computeShiftOfUserWithSubstitutions } from "../../utils/computeShiftOfUserWithSubstitutions.js";


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
        return results
    } catch (error) {
        console.error('Erreur lors de la récupération des vacations de l\'utilisateur : ', error.message);
        throw error;
    }
}

export { getUserShifts }