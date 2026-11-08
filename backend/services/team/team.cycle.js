import Team from '../../models/Team.js';
import Center from '../../models/Center.js';
import { AppError } from '../../error/AppError.js';
import { findLatestRotation } from '../../utils/findLatestRotation.js';
import { isValidDate } from '../../utils/validation.js';
import { DAY_MS, daysBetween, mod } from '../../utils/teamCycle.js';

const utcMidnight = (dateKey) => new Date(`${dateKey}T00:00:00Z`);

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
 * @param {string} teamId
 * @param {{ day: number, date: string, swap?: boolean }} input - `date` : YYYY-MM-DD (aujourd'hui dans le fuseau du centre)
 */
export async function setTeamCyclePosition (teamId, { day, date, swap = false }) {
    if (!isValidDate(date)) throw new AppError('Date invalide (YYYY-MM-DD)', 400);

    const team = await Team.findById(teamId);
    if (!team || team.deleted) throw new AppError('Équipe non trouvée', 404);

    const center = await Center.findById(team.center);
    if (!center) throw new AppError('Centre non trouvé', 404);

    const when = utcMidnight(date);
    const siblings = await Team.find({ center: center._id, deleted: false, _id: { $ne: team._id } });

    // Longueur du cycle : jours de la rotation active ; sans rotation, autant de jours que d'équipes (c'est la règle :
    // une équipe par jour), ce qui permet de définir les positions avant même de créer le tour de service
    const rotation = await findLatestRotation(center._id, when);
    const total = rotation?.days?.length || siblings.length + 1;

    if (!Number.isInteger(day) || day < 1 || day > total) {
        throw new AppError(`Le jour doit être compris entre 1 et ${total}`, 400);
    }

    // Ancre : celle du centre, ou la date saisie si le centre n'en a pas encore (les équipes sans offset restent lues sur cycleStartDate)
    const anchor = center.cycleAnchorDate ?? when;
    const offsetFor = (dayNumber) => mod(daysBetween(anchor, when) - (dayNumber - 1), total);
    const newOffset = offsetFor(day);

    const conflict = siblings.find((t) => effectiveOffset(t, anchor, total) === newOffset);

    const writes = [];
    const setOffset = (t, offset) => writes.push({
        updateOne: {
            filter: { _id: t._id },
            update: { $set: { cycleOffset: offset, cycleStartDate: new Date(anchor.getTime() + offset * DAY_MS) } },
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

    await Team.bulkWrite(writes);
    if (!center.cycleAnchorDate) await Center.updateOne({ _id: center._id }, { $set: { cycleAnchorDate: anchor } });

    return {
        team: await Team.findById(team._id),
        swappedWith: conflict && swap ? conflict.name : null,
    };
}
