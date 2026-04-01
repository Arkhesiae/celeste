import Substitution from "../../models/Substitution.js";
import User from "../../models/User.js";
import { computeShiftOfUserWithSubstitutions } from "../../utils/computeShiftOfUserWithSubstitutions.js";
import { getTeamAtGivenDate } from "../../utils/getTeamAtGivenDate.js";
import { AppError } from "../../error/appError.js";

const MIN_POINTS_TO_POST_REQUEST = -40;

export async function createDemand(data) {
    const {
        posterId,
        posterShift,
        comment,
        points,
        status = 'open',
        acceptedSwitches,
        isTrueSwitch
    } = data;


    // Validation de l'utilisateur
    const user = await User.findById(posterId).populate('teams');
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }

    if (user.points - points < MIN_POINTS_TO_POST_REQUEST) {
        throw new AppError('Vous ne pouvez pas poster cette demande, vous n\'avez pas assez de points', 400);
    }

    // Vérification du shift de l'utilisateur
    const givenDate = new Date(posterShift.date);
    const userShifts = await computeShiftOfUserWithSubstitutions(givenDate, posterId);
    const userShift = userShifts[0].shiftData;

    if (!userShift || !userShift.shift) {
        throw new AppError("L'utilisateur n'a pas de shift défini pour cette date", 400);
    }

    // Validation de l'équipe
    const team = getTeamAtGivenDate(user.teams, givenDate);
    if (!team) {
        throw new AppError("L'utilisateur n'appartient à aucune équipe à la date spécifiée", 400);
    }

    // Vérification des demandes existantes
    const existingDemands = await Substitution.find({
        posterId: posterId,
        'posterShift.date': posterShift.date,
        deleted: false,
        status: { $in: ['open', 'pending', 'accepted'] }
    });
    if (existingDemands.length > 0) {
        throw new AppError('Une demande existe déjà pour ce jour', 400);
    }

    let type;
    if (isTrueSwitch) {
        type = "switch";
    } else {
        type = acceptedSwitches.length > 0 ? "hybrid" : "substitution";
    }

    const selectedVariationId = posterShift.selectedVariation || null;

    if (selectedVariationId && userShift.shift.variations?.length > 0) {
        const validVariation = userShift.shift.variations.some((v) =>
            (v._id || v).toString() === (selectedVariationId._id || selectedVariationId).toString()
        );
        if (!validVariation) {
            throw new AppError('Variante invalide pour ce shift', 400);
        }
    }

    // Création de la demande
    const demand = new Substitution({
        posterId,
        posterShift: {
            shift: userShift.shift._id,
            selectedVariation: selectedVariationId ? (selectedVariationId._id || selectedVariationId) : null,
            teamId: userShift.team._id,
            date: posterShift.date
        },
        comment: comment || '',
        points,
        status: status,
        centerId: user.centerId,
        createdAt: new Date(),
        deleted: false,
        seenBy: [],
        consultedBy: [],
        interested: [],
        acceptedSwitches: acceptedSwitches || [],
        isTrueSwitch: isTrueSwitch || false,
        type: type
    });


    await demand.save();
    await demand.populate([
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' }
    ]);
    return demand;
};
