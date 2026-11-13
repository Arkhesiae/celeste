import { findOrThrow, inTransaction } from '../../utils/mongo.js';
import { anchorDayOf, occurrenceDays } from '../../utils/dates/dayAccess.js';
import { mod } from '../../utils/math.js';
import { daysBetween, toMongoDate, toPlainDate } from '../../utils/dates/plainDate.js';
import { fullName } from '../../utils/names.js';
import { sameId } from '../../utils/ids.js';
import { Temporal } from '@js-temporal/polyfill';
import Team from '../../models/Team.js';
import Center from '../../models/Center.js';
import User from '../../models/User.js';
import { previewUserPeriodImpact, sanitizeUserPeriod } from '../user/user.sanitizePeriod.js';
import { notifyDemandChanges } from '../email/demand/demand.changeNotifications.js';
import { AppError } from '../../error/AppError.js';
import { findLatestRotation } from '../rotation/rotation.latest.js';
import { isValidDate } from '../../utils/validation.js';


/** Offset effectif d'une équipe : son cycleOffset, sinon celui déduit de l'ancien cycleStartDate ; null si inconnu */
const effectiveOffset = (team, anchor, total) => {
    if (Number.isInteger(team.cycleOffset)) return team.cycleOffset;
    if (team.cycleStartDate) return mod(daysBetween(anchor, team.cycleStartDate), total);
    return null;
};

/**
 * Place une équipe à un jour donné de la rotation (ou du cycle, sans rotation active : voir `total` ci-dessous) : « à la date `date`, l'équipe est au jour `day` (1..N) ».
 * Écrit `cycleOffset` (modèle cible) et, tant que la migration dure, `cycleStartDate = ancre + offset` pour que
 * l'ancien champ reste cohérent (retour arrière possible). Crée l'ancre du centre si elle n'existe pas encore.
 *
 * Deux équipes ne peuvent pas être au même jour : en cas de conflit, la fonction refuse (code
 * CYCLE_POSITION_TAKEN) sauf avec `swap`, qui échange alors les positions des deux équipes.
 *
 * Changer la position d'une équipe réécrit ses vacations de base à partir d'aujourd'hui : les substitutions et les
 * entrées de calendrier liées à une vacation de ses membres (actuels, à venir et renforts) ne sont plus valables.
 * Sans `confirmed`, rien n'est modifié et la fonction renvoie `{ needsApproval: true, ... }` avec l'impact détaillé ;
 * avec `confirmed`, les substitutions sont annulées (ou l'accepteur retiré), les entrées liées à une vacation
 * désactivées, puis les personnes concernées prévenues par email après le commit.
 *
 * @param {string} teamId
 * @param {{ day: number, date: string, swap?: boolean, confirmed?: boolean, actorId?: string }} input
 *   `date` : YYYY-MM-DD (aujourd'hui dans le fuseau du centre) ; `actorId` : n'est pas notifié par email
 */
export async function setTeamCyclePosition (teamId, { day, date, swap = false, confirmed = false, actorId }) {
    if (!isValidDate(date)) throw new AppError('Date invalide (YYYY-MM-DD)', 400);

    const team = await Team.findById(teamId);
    if (!team || team.deleted) throw new AppError('Équipe non trouvée', 404);

    const center = await findOrThrow(Center, team.center, { message: 'Centre non trouvé' });
    // Jour de référence (PlainDate) : les dates de calendrier ne passent par Date qu'aux frontières Mongo
    let when;
    try {
        when = Temporal.PlainDate.from(date);
    } catch {
        throw new AppError('Date invalide (YYYY-MM-DD)', 400);
    }
    const siblings = await Team.find({ center: center._id, deleted: false, _id: { $ne: team._id } });

    // Longueur du cycle : jours de la rotation active ; sans rotation, autant de jours que d'équipes (c'est la règle :
    // une équipe par jour), ce qui permet de définir les positions avant même de créer le tour de service
    const rotation = await findLatestRotation(center._id, toMongoDate(when));
    const total = rotation?.days?.length || siblings.length + 1;

    if (!Number.isInteger(day) || day < 1 || day > total) {
        throw new AppError(`Le jour doit être compris entre 1 et ${total}`, 400);
    }

    // Ancre : celle du centre, ou la date saisie si le centre n'en a pas encore (les équipes sans offset restent lues sur cycleStartDate)
    const existingAnchorDay = anchorDayOf(center);
    const anchor = existingAnchorDay ? toPlainDate(existingAnchorDay) : when;
    const offsetFor = (dayNumber) => mod(daysBetween(anchor, when) - (dayNumber - 1), total);
    const newOffset = offsetFor(day);

    const conflict = siblings.find((t) => effectiveOffset(t, anchor, total) === newOffset);

    const writes = [];
    const setOffset = (t, offset) => writes.push({
        updateOne: {
            filter: { _id: t._id },
            update: { $set: { cycleOffset: offset, cycleStartDate: toMongoDate(anchor.add({ days: offset })) } },
        },
    });

    if (conflict) {
        if (!swap) {
            throw new AppError(`L'équipe ${conflict.name} est déjà à ce jour du cycle`, 400, 'CYCLE_POSITION_TAKEN');
        }
        const previous = effectiveOffset(team, anchor, total);
        if (previous === null) {
            throw new AppError("Échange impossible : l'équipe n'a pas encore de position dans le cycle", 400);
        }
        setOffset(conflict, previous);
    }
    setOffset(team, newOffset);

    const previous = effectiveOffset(team, anchor, total);
    if (previous === newOffset && !conflict) {
        return { team, swappedWith: null, unchanged: true };   // déjà à cette position : rien à faire
    }

    // Les vacations de base changent seulement si l'équipe avait déjà une position (sinon elles n'existaient pas)
    const teamsChanged = [team, ...(conflict && swap ? [conflict] : [])];
    const affectsExistingShifts = previous !== null || (conflict && swap);
    const period = { from: date };   // à partir d'aujourd'hui, sans date de fin

    const members = affectsExistingShifts ? await membersOfTeams(teamsChanged, when) : [];
    const impact = [];
    if (!confirmed) {
        for (const member of members) {
            const { substitutions, entries } = await previewUserPeriodImpact(member._id, period);
            if (substitutions.length || entries.length) {
                impact.push({
                    userId: member._id,
                    name: fullName(member),
                    substitutions,
                    entries,
                });
            }
        }
        if (impact.length) {
            return {
                needsApproval: true,
                message: `Ce changement annule ou retire des demandes de remplacement et désactive des entrées de calendrier de ${impact.length} membre(s) à partir d'aujourd'hui.`,
                teams: teamsChanged.map((t) => t.name),
                members: impact,
            };
        }
    }

    // Séquentiel : des opérations concurrentes sur une même session de transaction ne sont pas permises
    const writeAll = async (session) => {
        await Team.bulkWrite(writes, { session });
        // Ancre : les deux champs ; réécrite aussi quand seul l'ancien existe (le jumeau manquant est alors complété)
        if (!center.cycleAnchorDay) {
            await Center.updateOne({ _id: center._id }, { $set: { cycleAnchorDate: toMongoDate(anchor), cycleAnchorDay: anchor.toString() } }, { session });
        }
    };

    // Nettoyage et nouvelle position dans une même transaction ; sans membre à nettoyer, simple écriture
    const cancelled = [];
    const withdrawn = [];
    let deactivated = 0;
    if (members.length) {
        await inTransaction(async (session) => {
            cancelled.length = 0; withdrawn.length = 0; deactivated = 0;   // une tentative rejouée repart de zéro
            for (const member of members) {
                const result = await sanitizeUserPeriod(member._id, period, { session });
                cancelled.push(...result.cancelled);
                withdrawn.push(...result.withdrawn.map((demandId) => ({ demandId, accepterId: member._id })));
                deactivated += result.deactivated;
            }
            await writeAll(session);
        });
    } else {
        await writeAll(null);
    }

    // Après le commit uniquement : un rollback n'envoie aucun email
    if (cancelled.length || withdrawn.length) notifyDemandChanges({ cancelledIds: cancelled, withdrawn, actorId });

    return {
        team: await Team.findById(team._id),
        swappedWith: conflict && swap ? conflict.name : null,
        cancelled: cancelled.length,
        withdrawn: withdrawn.length,
        deactivated,
    };
}

/** Membres des équipes (actuels, à venir et renforts) : occupation qui n'est pas terminée avant `when` */
async function membersOfTeams (teams, when) {
    const ids = teams.map((t) => t._id);
    const users = await User.find({
        centerId: teams[0].center,
        isActive: { $ne: false },
        'teams.teamId': { $in: ids },
    }).select('name lastName teams');

    return users.filter((user) => user.teams.some((o) => ids.some((id) => sameId(id, o.teamId))
        && (!occurrenceDays(o).to || occurrenceDays(o).to >= when.toString())));
}
