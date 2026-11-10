import Center from '../../models/Center.js';
import { DEFAULT_TIME_ZONE } from '../../utils/dates/constants.js';

/**
 * Fuseau horaire des centres : il place les instants (« maintenant », un horodatage) sur un jour calendaire.
 * Un centre sans fuseau, ou introuvable, retombe sur DEFAULT_TIME_ZONE.
 */

/**
 * @param {Array<string|import('mongoose').Types.ObjectId>} centerIds
 * @returns {Promise<Map<string, string>>} id du centre (chaîne) -> fuseau IANA ; une seule requête pour tous les centres
 */
export async function getCenterTimeZones (centerIds) {
    const ids = [...new Set(centerIds.filter(Boolean).map(String))];
    const centers = ids.length ? await Center.find({ _id: { $in: ids } }).select('timeZone').lean() : [];

    const zones = new Map(ids.map((id) => [id, DEFAULT_TIME_ZONE]));
    for (const center of centers) zones.set(String(center._id), center.timeZone || DEFAULT_TIME_ZONE);
    return zones;
}

/** Fuseau IANA d'un centre */
export async function getCenterTimeZone (centerId) {
    if (!centerId) return DEFAULT_TIME_ZONE;
    return (await getCenterTimeZones([centerId])).get(String(centerId));
}
