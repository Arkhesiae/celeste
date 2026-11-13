/**
 * Enregistrement des entrées de calendrier : affectations, modifications, ajustements d'horaires, et entrées créées
 * quand une substitution est acceptée.
 */
import { CalendarEntry, Assignment, Modification, HourPatch } from '../../models/CalendarEntry.js';
import { toDay } from '../../utils/dates/dayFields.js';
import { dayFilter, posterDayOf } from '../../utils/dates/dayAccess.js';
import { findOrThrow } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import User from '../../models/User.js';
import Substitution from '../../models/Substitution.js';
import { computeUserShifts } from '../planning/planning.userShifts.js';
import { AppError } from '../../error/AppError.js';
import { cancelModifications, cancelHourPatches } from './calendarEntry.cancel.js';

const isSameShift = (userShift, data) =>
    sameId(userShift?.[0]?.shiftData?.shift?._id, data.shiftId);

export async function registerEntry (userId, date, data) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    const handlers = {
        assignment: registerAssignment,
        modification: registerModification,
        hourPatch: registerHourPatch,
    };

    const handler = handlers[data.type];
    if (!handler) {
        throw new AppError('Type d\'entrée invalide', 400);
    }

    const [userShift, substitution, latestAssignment, latestModification, latestHourPatch] = await Promise.all([
        computeUserShifts([date], userId),
        Substitution.findOne({
            $and: [
                { $or: [{ posterId: userId }, { accepterId: userId }] },
                dayFilter('posterShift.day', 'posterShift.date', { eq: toDay(date) }),
            ],
            status: { $in: ['open', 'accepted'] },
        }).sort({ createdAt: -1 }),
        Assignment.findOne({ userId, date, active: true }).sort({ createdAt: -1 }),
        Modification.findOne({ userId, date, active: true }).sort({ createdAt: -1 }),
        HourPatch.findOne({ userId, date, active: true }).sort({ createdAt: -1 }),
    ]);

    const recomputeShift = () => computeUserShifts([date], userId);

    const result = await handler(user, date, data, { userShift, substitution, latestAssignment, latestModification, latestHourPatch, recomputeShift });
    return result;
}

async function registerModification (user, date, data, { userShift, latestModification, recomputeShift }) {
    if (!isSameShift(userShift, data)) {
        throw new AppError('Impossible de créer une modification car le shift ne correspond pas', 422);
    }

    if (latestModification) {
        latestModification.active = false;
        await latestModification.save();
    }

    await cancelHourPatches(user._id, date);

    const entry = new CalendarEntry({
        type: data.type,
        subType: data.entryType,
        shiftData: {
            shift: data.shiftId,
            selectedVariation: data.selectedVariation,
            team: data.teamId,
        },
        userId: user._id,
        date,
        centerId: user.centerId,
    });

    await entry.save();
    return { userShift: await recomputeShift(), updatedDemands: null, type: 'modification' };
}

async function registerAssignment (user, date, data, { substitution, latestAssignment, recomputeShift }) {
    if (latestAssignment?.subType === 'substitution') {
        throw new AppError('Impossible de créer une entrée sur un remplacement actif, annulez d\'abord le remplacement', 422);
    }

    if (substitution) {
        throw new AppError('Impossible de créer une entrée si une demande est en cours ce jour', 409);
    }

    if (latestAssignment) {
        latestAssignment.active = false;
        await latestAssignment.save();
    }

    await cancelModifications(user._id, date);
    await cancelHourPatches(user._id, date);


    const entry = new CalendarEntry({
        type: data.type,
        subType: data.entryType,
        ...(data.shiftId && {
            shiftData: {
                shift: data.shiftId,
                selectedVariation: data.selectedVariation,
                team: data.team,
            },
        }),
        userId: user._id,
        date,
        centerId: user.centerId,
        startTime: data.startTime,
        endTime: data.endTime,
    });

    await entry.save();
    return { userShift: await recomputeShift(), updatedDemands: null, type: 'creation' };
}

async function registerHourPatch (user, date, data, { latestHourPatch, recomputeShift }) {
    if (latestHourPatch) {
        latestHourPatch.active = false;
        await latestHourPatch.save();
    }

    // Horaires de référence SANS patch (après désactivation de l'ancien)
    const userShift = await computeUserShifts([date], user._id);
    const current = userShift?.[0];
    const currentShiftId = current?.shiftData?.shift?._id?.toString?.()
        ?? current?.shiftData?.shift?.toString?.();
    const requestedShiftId = data.shiftId?.toString?.() ?? data.shiftId;

    if (!currentShiftId || !requestedShiftId || currentShiftId !== requestedShiftId) {
        throw new AppError('Impossible de créer une MDDA car le shift ne correspond pas', 422);
    }

    const teamFromShift = current?.shiftData?.team;
    const teamId = data.teamId
        ?? data.team
        ?? teamFromShift?._id
        ?? teamFromShift
        ?? current?.baseShift?.team?._id
        ?? current?.baseShift?.team;

    if (!teamId) {
        throw new AppError('Impossible de créer une MDDA : équipe introuvable', 422);
    }

    const baseStart = current?.startTime;
    const baseEnd = current?.endTime;
    if (!baseStart || !baseEnd) {
        throw new AppError('Impossible de créer une MDDA : horaires de référence introuvables', 422);
    }

    const toMinutes = (time) => {
        const [h, m] = String(time).split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) {
            throw new AppError('Format d\'heure invalide (HH:MM attendu)', 400);
        }
        return h * 60 + m;
    };

    let adjustedStart;
    let adjustedEnd;

    if (data.startTime != null && data.endTime != null) {
        adjustedStart = (toMinutes(data.startTime) - toMinutes(baseStart)) / 60;
        adjustedEnd = (toMinutes(data.endTime) - toMinutes(baseEnd)) / 60;
    } else if (data.adjustedTime?.adjustedStart != null && data.adjustedTime?.adjustedEnd != null) {
        adjustedStart = Number(data.adjustedTime.adjustedStart);
        adjustedEnd = Number(data.adjustedTime.adjustedEnd);
    } else {
        throw new AppError('Horaires MDDA requis (startTime / endTime)', 400);
    }

    if (!Number.isFinite(adjustedStart) || !Number.isFinite(adjustedEnd)) {
        throw new AppError('Ajustements MDDA invalides', 400);
    }

    if (adjustedStart === 0 && adjustedEnd === 0) {
        throw new AppError('Les horaires MDDA sont identiques aux horaires prévus', 400);
    }

    const selectedVariation = data.selectedVariation
        && data.selectedVariation !== 'vic'
        && data.selectedVariation !== 'disp'
        && data.selectedVariation !== 'pres'
        ? (data.selectedVariation._id ?? data.selectedVariation)
        : (current?.shiftData?.selectedVariation?._id ?? null);

    const entry = new HourPatch({
        userId: user._id,
        subType: 'mdda',
        date,
        adjustedTime: {
            adjustedStart,
            adjustedEnd,
        },
        centerId: user.centerId,
        shiftData: {
            shift: data.shiftId,
            selectedVariation,
            team: teamId,
        },
    });

    await entry.save();
    return { userShift: await recomputeShift(), updatedDemands: null, type: 'creation' };
}



async function registerMDDA (userId, date, data) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    const userShift = await computeUserShifts([date], userId);

    if (!isSameShift(userShift, data)) {
        throw new AppError('Impossible de créer une MDDA car le shift ne correspond pas', 422);
    }

    const teamFromShift = userShift[0]?.shiftData?.team;
    const teamId = data.teamId
        ?? data.team
        ?? teamFromShift?._id
        ?? teamFromShift;

    if (!teamId) {
        throw new AppError('Impossible de créer une MDDA : équipe introuvable', 422);
    }

    const mdda = new HourPatch({
        userId,
        subType: 'mdda',
        date,
        adjustedTime: {
            adjustedStart: 1,
            adjustedEnd: 2,
        },
        centerId: user.centerId,
        shiftData: {
            shift: data.shiftId,
            selectedVariation: data.selectedVariation ?? userShift[0]?.shiftData?.selectedVariation?._id ?? null,
            team: teamId,
        },
    });
    await mdda.save();
}

/**
 * Crée les entrées de calendrier d'une substitution acceptée pour le demandeur et l'accepteur.
 * @param {Object} demand - la demande acceptée
 * @param {Object} [opts]
 * @param {ClientSession} [opts.session] - lectures et écritures dans la transaction. Dans ce cas les vacations
 *   recalculées ne sont pas retournées (`posterShift` / `accepterShift` = null) : computeUserShifts ne lit pas
 *   dans la session et verrait l'état d'avant les écritures ; à recalculer après le commit.
 */
export async function addSubstitutionEntries (demand, { session } = {}) {
    if (!demand) {
        throw new AppError('Demande invalide', 400);
    }

    try {
        const dateStr = posterDayOf(demand);

        // Opérations l'une après l'autre : dans une transaction, des opérations concurrentes sur la même session font
        // échouer la transaction (NoSuchTransaction) quand elles en sont les premières
        const findLatestAssignment = (userId) => Assignment.findOne(
            { userId, date: dateStr, active: true, subType: { $ne: 'substitution' } },
            null,
            { sort: { createdAt: -1 }, session }
        );
        const latestAccepterAssignment = await findLatestAssignment(demand.accepterId);
        const latestPosterAssignment = await findLatestAssignment(demand.posterId);

        if (latestAccepterAssignment) await Assignment.updateOne({ _id: latestAccepterAssignment._id }, { active: false }, { session });
        if (latestPosterAssignment) await Assignment.updateOne({ _id: latestPosterAssignment._id }, { active: false }, { session });

        const accepterEntry = new Assignment({
            shiftData: {
                team: demand.posterShift.teamId,
                shift: demand.posterShift.shift,
                selectedVariation: demand.posterShift.selectedVariation,
            },
            subType: 'substitution',
            substitution: {
                id: demand._id,
                savedEntry: latestAccepterAssignment?._id,
            },
            userId: demand.accepterId,
            date: dateStr,
            centerId: demand.centerId,
        });

        const posterEntry = new Assignment({
            shiftData: null,
            subType: 'substitution',
            substitution: {
                id: demand._id,
                savedEntry: latestPosterAssignment?._id,
            },
            userId: demand.posterId,
            date: dateStr,
            centerId: demand.centerId,
        });


        await accepterEntry.save({ session });
        await posterEntry.save({ session });

        if (session) {
            return { posterShift: null, accepterShift: null, updatedDemands: null, type: 'substitution' };
        }

        const [posterShifts, accepterShifts] = await Promise.all([
            computeUserShifts([posterDayOf(demand)], demand.posterId),
            computeUserShifts([posterDayOf(demand)], demand.accepterId),
        ]);

        return {
            posterShift: posterShifts[0],
            accepterShift: accepterShifts[0],
            updatedDemands: null,
            type: 'substitution',
        };

    } catch (err) {
        // Conserve l'étiquette TransientTransactionError (WriteConflict…) pour que withTransaction réessaie
        if (err?.hasErrorLabel?.('TransientTransactionError')) throw err;
        console.error("Erreur lors de l'ajout des entrées de substitution :", err);
        throw new AppError("Erreur lors de l'ajout des entrées de substitution", 500);
    }
}
