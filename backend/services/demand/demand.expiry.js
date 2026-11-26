/**
 * Tâches planifiées sur les demandes : archivage des demandes ouvertes passées, clôture des demandes acceptées terminées.
 * « Passée » : le jour de la vacation est avant aujourd'hui **dans le fuseau du centre de la demande**.
 */
import Demand from '../../models/Demand.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import { dayFilter, posterDayOf } from '../../utils/dates/dayAccess.js';
import { getCenterTimeZones } from '../center/center.timezone.js';

// Le fuseau le plus en avance (UTC+14) : aucun centre n'est à un jour plus tardif que le sien
const LATEST_TIME_ZONE = 'Pacific/Kiritimati';

/** Les demandes d'un statut dont le jour est passé pour leur centre */
const findPastDemands = async (status) => {
    const candidates = await Demand.find({
        status,
        ...dayFilter('posterShift.day', 'posterShift.date', { lt: todayIn(LATEST_TIME_ZONE).toString() }),
        deleted: false
    }).select('centerId posterShift.day posterShift.date').lean();

    const timeZones = await getCenterTimeZones(candidates.map((demand) => demand.centerId));
    const todayByZone = new Map();
    const todayOf = (centerId) => {
        const timeZone = timeZones.get(String(centerId));   // sans centre : `todayIn` prend le fuseau par défaut
        if (!todayByZone.has(timeZone)) todayByZone.set(timeZone, todayIn(timeZone).toString());
        return todayByZone.get(timeZone);
    };

    return candidates.filter((demand) => posterDayOf(demand) < todayOf(demand.centerId));
};

/** Sort les demandes passées d'un statut des listes, sous leur statut final ; retourne leur nombre */
const archivePastDemands = async (status, finalStatus) => {
    const past = await findPastDemands(status);
    if (!past.length) return 0;

    // Le statut est revérifié à l'écriture : une demande acceptée ou annulée entre-temps n'est pas écrasée
    const result = await Demand.updateMany(
        { _id: { $in: past.map((demand) => demand._id) }, status },
        { $set: { deleted: true, status: finalStatus, updatedAt: new Date() } }
    );
    return result.modifiedCount;
};

/**
 * Archive les demandes ouvertes dont les dates sont passées (excluant aujourd'hui)
 * @returns {Promise<number>} Nombre de demandes archivées
 */
export const processPastDemands = () => archivePastDemands('open', 'expired');

/** Clôt les demandes acceptées dont les dates sont passées */
export const processAndCompleteDemands = () => archivePastDemands('accepted', 'completed');
