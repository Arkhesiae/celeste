import Substitution from "../../models/Substitution.js";
import { findOrThrow } from '../../utils/mongo.js';
import User from "../../models/User.js";
import { shiftMapFromSingleDemand, shiftMapToArray } from "../planning/generateShiftsMap.js";
import { categorize } from "../planning/categorizeDemand.js";
import { AppError } from "../../error/AppError.js";

const getCompatibility = async (demandId, userId) => {
    const demand = await Substitution.findById(demandId).populate([
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' },
        { path: 'acceptedSwitches.shift', select: '_id name' }
    ]);
    if (!demand) {
        throw new AppError('Demande non trouvée', 404);
    }
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    const shiftsMap = await shiftMapFromSingleDemand(demand, userId);
    const compatibility = await categorize(demand, shiftsMap);
    const shiftsArray = shiftMapToArray(shiftsMap)
    return { compatibility, shiftsArray };
};

export {
    getCompatibility
};