import { findOrThrow, inTransaction } from '../../utils/mongo.js';
import { anchorDayOf } from '../../utils/dates/dayAccess.js';
import { mod } from '../../utils/math.js';
import { daysBetween, toMongoDate, toPlainDate } from '../../utils/dates/plainDate.js';
import { fullName } from '../../utils/names.js';
import { isValidDate } from '../../utils/validation.js';
import Team from '../../models/Team.js';
import Center from '../../models/Center.js';
import User from '../../models/User.js';
import { AppError } from '../../error/AppError.js';
import { effectiveOffset } from './team.cycleIndex.js';
import { holdsAnyTeamFrom } from './team.segments.js';
import { findLatestRotation } from '../rotation/rotation.latest.js';
import { previewUserPeriodImpact, sanitizeUserPeriod } from '../user/user.sanitizePeriod.js';
import { notifyDemandChanges } from '../email/demand/demand.changeNotifications.js';

/**
 * Déplacement d'une équipe dans le cycle de la rotation. `setTeamCyclePosition` enchaîne : lecture, calcul des positions
 * (`planCycleMove`, sans accès à la base), aperçu de ce qui serait annulé (`previewImpact`), écriture (`applyCycleMove`).
 */

/**
 * Les positions à écrire pour que `team` soit au jour `day` à la date `when`. Fonction pure.
 *
 * Écrit `cycleOffset` (modèle cible) et, tant que la migration dure, `cycleStartDate = ancre + offset` pour que
 * l'ancien champ reste cohérent (retour arrière possible). L'ancre est celle du centre, ou `when` si le centre n'en a pas encore
 * (les équipes sans offset restent lues sur cycleStartDate).
 *
 * @param {{ team, siblings: Array, anchorDay: string|null, total: number, day: number, when: Temporal.PlainDate, swap: boolean }} input
 *   `siblings` : les autres équipes du centre ; `total` : nombre de jours du cycle
 * @returns {{ anchor: Temporal.PlainDate, writes: Array, teamsChanged: Array, swappedWith: Object|null, unchanged: boolean,
 *   affectsExistingShifts: boolean }}
 */
const planCycleMove = ({ team, siblings, anchorDay, total, day, when, swap }) => {
    const anchor = anchorDay ? toPlainDate(anchorDay) : when;
    const newOffset = mod(daysBetween(anchor, when) - (day - 1), total);
    const previousOffset = effectiveOffset(team, anchor, total);
    const conflict = siblings.find((sibling) => effectiveOffset(sibling, anchor, total) === newOffset) ?? null;

    // Deux équipes ne peuvent pas être au même jour : sans `swap`, on refuse ; avec, l'autre équipe prend l'ancienne position
    if (conflict && !swap) {
        throw new AppError(`L'équipe ${conflict.name} est déjà à ce jour du cycle`, 400, 'CYCLE_POSITION_TAKEN');
    }
    if (conflict && previousOffset === null) {
        throw new AppError("Échange impossible : l'équipe n'a pas encore de position dans le cycle", 400);
    }

    const positionOf = (movedTeam, offset) => ({
        updateOne: {
            filter: { _id: movedTeam._id },
            update: { $set: { cycleOffset: offset, cycleStartDate: toMongoDate(anchor.add({ days: offset })) } },
        },
    });

    return {
        anchor,
        writes: [...(conflict ? [positionOf(conflict, previousOffset)] : []), positionOf(team, newOffset)],
        teamsChanged: conflict ? [team, conflict] : [team],
        swappedWith: conflict,
        unchanged: previousOffset === newOffset && !conflict,
        // Les vacations de base ne changent que si l'équipe avait déjà une position (sinon elles n'existaient pas)
        affectsExistingShifts: previousOffset !== null,
    };
};

/** Membres des équipes (actuels, à venir et renforts) : ceux qui tiennent l'une d'elles à partir de `when` */
const membersOfTeams = async (teams, when) => {
    const ids = teams.map((t) => t._id);
    const users = await User.find({
        centerId: teams[0].center,
        isActive: { $ne: false },
        'teams.teamId': { $in: ids },
    }).select('name lastName teams');

    return users.filter((user) => holdsAnyTeamFrom(user.teams, ids, when.toString()));
};

/** Pour chaque membre qui a quelque chose à perdre sur la période : ses demandes touchées et ses entrées désactivées (lecture seule) */
const previewImpact = async (members, period) => {
    const impact = [];
    for (const member of members) {
        const { demands, entries } = await previewUserPeriodImpact(member._id, period);
        if (demands.length || entries.length) {
            impact.push({ userId: member._id, name: fullName(member), demands, entries });
        }
    }
    return impact;
};

/** Écrit les positions et, au premier placement, l'ancre du centre */
const savePositions = async (center, { writes, anchor }, session) => {
    await Team.bulkWrite(writes, { session });
    // Ancre : les deux champs ; réécrite aussi quand seul l'ancien existe (le jumeau manquant est alors complété)
    if (!center.cycleAnchorDay) {
        await Center.updateOne(
            { _id: center._id },
            { $set: { cycleAnchorDate: toMongoDate(anchor), cycleAnchorDay: anchor.toString() } },
            { session },
        );
    }
};

/**
 * Nettoie les membres sur la période puis enregistre les positions, dans une même transaction ; sans membre à nettoyer, simple
 * écriture.
 * @returns {Promise<{ cancelled: string[], withdrawn: Array<{ demandId, accepterId }>, deactivated: number }>}
 */
const applyCycleMove = async (center, plan, members, period) => {
    if (!members.length) {
        await savePositions(center, plan, null);
        return { cancelled: [], withdrawn: [], deactivated: 0 };
    }

    return inTransaction(async (session) => {
        // Recréé à chaque tentative : une transaction rejouée repart de zéro
        const done = { cancelled: [], withdrawn: [], deactivated: 0 };
        // Séquentiel : des opérations concurrentes sur une même session de transaction ne sont pas permises
        for (const member of members) {
            const result = await sanitizeUserPeriod(member._id, period, { session });
            done.cancelled.push(...result.cancelled);
            done.withdrawn.push(...result.withdrawn.map((demandId) => ({ demandId, accepterId: member._id })));
            done.deactivated += result.deactivated;
        }
        await savePositions(center, plan, session);
        return done;
    });
};

/**
 * Place une équipe à un jour donné de la rotation : « à la date `date`, l'équipe est au jour `day` (1..N) ». Sans rotation active, le
 * cycle a autant de jours que le centre a d'équipes. Les règles de position (conflit, échange, ancre) sont dans `planCycleMove`.
 *
 * Changer la position d'une équipe réécrit ses vacations de base à partir d'aujourd'hui : les demandes et les
 * entrées de calendrier liées à une vacation de ses membres (actuels, à venir et renforts) ne sont plus valables.
 * Sans `confirmed`, rien n'est modifié et la fonction renvoie `{ needsApproval: true, ... }` avec l'impact détaillé ;
 * avec `confirmed`, les demandes sont annulées (ou l'accepteur retiré), les entrées liées à une vacation
 * désactivées, puis les personnes concernées prévenues par email après le commit.
 *
 * @param {string} teamId
 * @param {{ day: number, date: string, swap?: boolean, confirmed?: boolean, actorId?: string }} input
 *   `date` : YYYY-MM-DD (aujourd'hui dans le fuseau du centre) ; `actorId` : n'est pas notifié par email
 */
export async function setTeamCyclePosition (teamId, { day, date, swap = false, confirmed = false, actorId }) {
    if (!isValidDate(date)) throw new AppError('Date invalide (YYYY-MM-DD)', 400);
    // Jour de référence (PlainDate) : les dates de calendrier ne passent par Date qu'aux frontières Mongo
    const when = toPlainDate(date);

    const team = await Team.findById(teamId);
    if (!team || team.deleted) throw new AppError('Équipe non trouvée', 404);
    const center = await findOrThrow(Center, team.center, { message: 'Centre non trouvé' });
    const siblings = await Team.find({ center: center._id, deleted: false, _id: { $ne: team._id } });

    // Longueur du cycle : jours de la rotation active ; sans rotation, autant de jours que d'équipes (c'est la règle :
    // une équipe par jour), ce qui permet de définir les positions avant même de créer le tour de service
    const rotation = await findLatestRotation(center._id, toMongoDate(when));
    const total = rotation?.days?.length || siblings.length + 1;
    if (!Number.isInteger(day) || day < 1 || day > total) {
        throw new AppError(`Le jour doit être compris entre 1 et ${total}`, 400);
    }

    const plan = planCycleMove({ team, siblings, anchorDay: anchorDayOf(center), total, day, when, swap });
    if (plan.unchanged) return { team, swappedWith: null, unchanged: true };

    const members = plan.affectsExistingShifts ? await membersOfTeams(plan.teamsChanged, when) : [];
    const period = { from: date };   // à partir d'aujourd'hui, sans date de fin

    if (!confirmed) {
        const impact = await previewImpact(members, period);
        if (impact.length) {
            return {
                needsApproval: true,
                message: `Ce changement annule ou retire des demandes de remplacement et désactive des entrées de calendrier de ${impact.length} membre(s) à partir d'aujourd'hui.`,
                teams: plan.teamsChanged.map((t) => t.name),
                members: impact,
            };
        }
    }

    const { cancelled, withdrawn, deactivated } = await applyCycleMove(center, plan, members, period);

    // Après le commit uniquement : un rollback n'envoie aucun email
    if (cancelled.length || withdrawn.length) notifyDemandChanges({ cancelledIds: cancelled, withdrawn, actorId });

    return {
        team: await Team.findById(team._id),
        swappedWith: plan.swappedWith?.name ?? null,
        cancelled: cancelled.length,
        withdrawn: withdrawn.length,
        deactivated,
    };
}
