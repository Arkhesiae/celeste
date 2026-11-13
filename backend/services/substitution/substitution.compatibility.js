import Substitution from "../../models/Substitution.js";
import { findOrThrow } from '../../utils/mongo.js';
import User from "../../models/User.js";
import { shiftMapFromSingleDemand, shiftMapToArray } from "../planning/planning.shiftsMap.js";
import { categorizeWithVariations } from "./compatibility/demandVariations.js";
import { AppError } from "../../error/AppError.js";
import { getCenterTimeZone } from "../center/center.timezone.js";
import { withZonedBounds, wallClockIso } from "../../utils/shifts/shiftTime.js";

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
    const timeZone = await getCenterTimeZone(user.centerId);
    const compatibility = await categorizeWithVariations(demand, shiftsMap, { timeZone });
    // Le front lit `start` / `end` en texte : l'heure du centre écrite avec un Z (voir wallClockIso)
    const shiftsArray = withZonedBounds(shiftMapToArray(shiftsMap), timeZone)
        .map(shift => ({ ...shift, start: wallClockIso(shift.start), end: wallClockIso(shift.end) }));
    return { compatibility, shiftsArray };
};

export {
    getCompatibility
};