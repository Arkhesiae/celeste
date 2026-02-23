
import Substitution from "../../models/Substitution.js";
import User from "../../models/User.js";
import { shiftMapFromSingleDemand, shiftMapToArray } from "../../utils/generateShiftsMap.js";
import { categorize } from "../../utils/categorizeDemand.js";

const getCompatibility = async (demandId, userId) => {
    const demand = await Substitution.findById(demandId).populate([
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' }
    ]);
    if (!demand) {
        throw new Error('Demande non trouvée');
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }

    const shiftsMap = await shiftMapFromSingleDemand(demand, userId);

    let t1 = Date.now();
    const compatibility = await categorize(demand, shiftsMap);
    let t2 = Date.now();
    // console.log(compatibility)
    console.log('Categorize took ' + (t2 - t1) + 'ms');
    const shiftsArray = shiftMapToArray(shiftsMap)
    return { compatibility, shiftsArray };
};

export {
    getCompatibility
};