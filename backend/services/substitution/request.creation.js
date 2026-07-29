import Substitution from "../../models/Substitution.js";
import User from "../../models/User.js";
import { computeUserShifts } from "../../utils/computeUserShifts.js";
import { getTeamAtGivenDate } from "../../utils/getTeamAtGivenDate.js";
import { AppError } from "../../error/AppError.js";

const MIN_POINTS_TO_POST_REQUEST = -40;

const maximumTransactionPoints = (points, acceptedSwitches) => {
    let maxPoints = points;
    acceptedSwitches.forEach((s) => {
        if (s.points > maxPoints) {
            maxPoints = s.points;
        }
    });
    return maxPoints;
}

export async function createDemand (data) {
    const {
        posterId,
        posterShift,
        comment,
        points,
        status = 'open',
        acceptedSwitches,
        isTrueSwitch
    } = data;

    // Validate user
    const user = await User.findById(posterId).populate('teams');
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }

    const maxPoints = maximumTransactionPoints(points, acceptedSwitches)
    if (user.points - maxPoints < MIN_POINTS_TO_POST_REQUEST) {
        throw new AppError("Vous ne pouvez pas poster cette demande, vous n'avez pas assez de points", 400);
    }

    // Validate shift
    const givenDate = new Date(posterShift.date);
    const userShifts = await computeUserShifts([givenDate], posterId);
    const userShift = userShifts[0].shiftData;

    if (!userShift?.shift) {
        throw new AppError("L'utilisateur n'a pas de shift défini pour cette date", 400);
    }

    // Validate team
    const team = getTeamAtGivenDate(user.teams, givenDate);
    if (!team) {
        throw new AppError("L'utilisateur n'appartient à aucune équipe à la date spécifiée", 400);
    }

    // Check for existing open demands on this date
    const existingDemands = await Substitution.find({
        posterId,
        'posterShift.date': posterShift.date,
        deleted: false,
        status: { $in: ['open'] }
    });
    if (existingDemands.length > 0) {
        throw new AppError('Une demande en attente existe déjà pour ce jour', 400);
    }

    // Validate selected variation if provided
    const selectedVariationId = posterShift.selectedVariation ?? null;
    if (selectedVariationId && userShift.shift.variations?.length > 0) {
        const validVariation = userShift.shift.variations.some(
            (v) => (v._id ?? v).toString() === (selectedVariationId._id ?? selectedVariationId).toString()
        );
        if (!validVariation) {
            throw new AppError('Variante invalide pour ce shift', 400);
        }
    }

    // Determine type
    let type;
    if (isTrueSwitch) {
        type = 'switch';
    } else {
        type = acceptedSwitches?.length > 0 ? 'hybrid' : 'substitution';
    }

    // Find accepted substitutions involving the poster on the same day
    const sameDayAcceptedSubstitutions = await Substitution.find({
        'posterShift.date': posterShift.date,
        deleted: false,
        status: 'accepted',
        $or: [
            { posterId },
            { accepterId: posterId }
        ]
    }).select('_id');

    const dependsOn = sameDayAcceptedSubstitutions.map((s) => s._id);

    // Create demand
    const teamId = userShift.team?._id ?? userShift.team;
    if (!teamId) {
        throw new AppError("Équipe introuvable pour cette vacation", 400);
    }

    const demand = new Substitution({
        posterId,
        posterShift: {
            shift: userShift.shift._id,
            selectedVariation: selectedVariationId
                ? (selectedVariationId._id ?? selectedVariationId)
                : null,
            teamId,
            date: posterShift.date
        },
        comment: comment || '',
        points,
        status,
        centerId: user.centerId,
        createdAt: new Date(),
        deleted: false,
        seenBy: [],
        consultedBy: [],
        interested: [],
        acceptedSwitches: acceptedSwitches || [],
        type,
        dependsOn
    });

    await demand.save();
    await demand.populate([
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' }
    ]);

    return demand;
}
