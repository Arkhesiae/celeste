import Center from '../../models/Center.js';
import Substitution from '../../models/Substitution.js';
import { dayFilter } from '../../utils/dates/dayAccess.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import { getCenterTimeZones } from './center.timezone.js';
import { ensureCenterLocations } from './center.geocode.js';

/**
 * Données de la carte des centres du tableau de bord : pour chaque centre localisé, son nom et le nombre de demandes
 * de remplacement / permutation à venir, ouvertes (`open`) et acceptées (`accepted`, c'est-à-dire prises).
 *
 * Comptes uniquement, ouverts à tout utilisateur connecté (aucun contenu de demande, aucun nom de personne) : c'est un
 * choix voulu, la carte montre l'activité des AUTRES centres. « À venir » = jour de la vacation d'origine aujourd'hui
 * ou plus tard, « aujourd'hui » étant celui du fuseau de chaque centre.
 *
 * Les centres dont la position n'est pas encore connue ne sont pas renvoyés ; leur recherche est lancée en arrière-plan
 * (voir center.geocode.js) et `pendingLocations` dit combien il en reste.
 *
 * @param {string} [ownCenterId] - centre de l'utilisateur, signalé par `isOwn`
 * @returns {Promise<{ centers: Array, pendingLocations: number }>}
 */
export async function getCentersMap (ownCenterId) {
    const allCenters = await Center.find({ deleted: false }).select('name OACI type timeZone location').lean();
    const located = allCenters.filter((center) => Number.isFinite(center.location?.latitude) && Number.isFinite(center.location?.longitude));
    const pendingLocations = allCenters.length - located.length;

    if (pendingLocations > 0) void ensureCenterLocations();
    if (located.length === 0) return { centers: [], pendingLocations };

    // Une condition par centre : « ses demandes ouvertes ou acceptées, à partir d'aujourd'hui dans son fuseau »
    const timeZones = await getCenterTimeZones(located.map((center) => center._id));
    const upcomingByCenter = located.map((center) => ({
        centerId: center._id,
        ...dayFilter('posterShift.day', 'posterShift.date', { gte: todayIn(timeZones.get(String(center._id))).toString() }),
    }));

    const counts = await Substitution.aggregate([
        { $match: { deleted: false, status: { $in: ['open', 'accepted'] }, $or: upcomingByCenter } },
        { $group: { _id: { centerId: '$centerId', status: '$status' }, count: { $sum: 1 } } },
    ]);

    const countsByCenter = new Map();
    for (const { _id, count } of counts) {
        const key = String(_id.centerId);
        countsByCenter.set(key, { ...countsByCenter.get(key), [_id.status]: count });
    }

    const centers = located.map((center) => ({
        _id: center._id,
        name: center.name,
        OACI: center.OACI,
        type: center.type,
        latitude: center.location.latitude,
        longitude: center.location.longitude,
        open: countsByCenter.get(String(center._id))?.open ?? 0,
        accepted: countsByCenter.get(String(center._id))?.accepted ?? 0,
        isOwn: Boolean(ownCenterId) && String(center._id) === String(ownCenterId),
    }));

    return { centers, pendingLocations };
}
