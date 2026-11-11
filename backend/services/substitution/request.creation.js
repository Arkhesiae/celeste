import Substitution from "../../models/Substitution.js";
import { dayFilter } from '../../utils/dates/dayAccess.js';
import { toCalendarDay } from '../../utils/dates/calendarDay.js';
import { findOrThrow } from '../../utils/mongo.js';
import User from "../../models/User.js";
import { computeUserShifts } from "../planning/computeUserShifts.js";
import { getTeamAtDay } from "../../utils/getTeamAtDay.js";
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
    const user = await findOrThrow(User, posterId, { message: 'Utilisateur non trouvé', populate: 'teams' });
    const maxPoints = maximumTransactionPoints(points, acceptedSwitches)
    if (user.points - maxPoints < MIN_POINTS_TO_POST_REQUEST) {
        throw new AppError("Vous ne pouvez pas poster cette demande, vous n'avez pas assez de points", 400);
    }

    // Validate shift
    const givenDay = toCalendarDay(posterShift.date);
    if (!givenDay) throw new AppError('Date de vacation invalide', 400);
    const [computedShift] = await computeUserShifts([givenDay.toString()], posterId);
    const shiftAssignment = computedShift.shiftData;

    if (!shiftAssignment?.shift) {
        throw new AppError("L'utilisateur n'a pas de shift défini pour cette date", 400);
    }

    // Validate team
    const team = getTeamAtDay(user.teams, givenDay);
    if (!team) {
        throw new AppError("L'utilisateur n'appartient à aucune équipe à la date spécifiée", 400);
    }

    // Check for existing open demands on this date
    const existingDemands = await Substitution.find({
        posterId,
        ...dayFilter('posterShift.day', 'posterShift.date', { eq: givenDay.toString() }),
        deleted: false,
        status: { $in: ['open'] }
    });
    if (existingDemands.length > 0) {
        throw new AppError('Une demande en attente existe déjà pour ce jour', 400);
    }

    // Validate selected variation if provided
    const selectedVariationId = posterShift.selectedVariation ?? null;
    if (selectedVariationId && shiftAssignment.shift.variations?.length > 0) {
        const validVariation = shiftAssignment.shift.variations.some(
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
        deleted: false,
        status: 'accepted',
        $and: [
            dayFilter('posterShift.day', 'posterShift.date', { eq: givenDay.toString() }),
            { $or: [{ posterId }, { accepterId: posterId }] },
        ],
    }).select('_id');

    const dependsOn = sameDayAcceptedSubstitutions.map((s) => s._id);

    // Create demand
    const teamId = shiftAssignment.team?._id ?? shiftAssignment.team;
    if (!teamId) {
        throw new AppError("Équipe introuvable pour cette vacation", 400);
    }

    const demand = new Substitution({
        posterId,
        posterShift: {
            shift: shiftAssignment.shift._id,
            selectedVariation: selectedVariationId
                ? (selectedVariationId._id ?? selectedVariationId)
                : null,
            teamId,
            date: posterShift.date,
            day: givenDay.toString()   // jumeau « jour » de date (YYYY-MM-DD)
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
