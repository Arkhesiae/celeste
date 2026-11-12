import Center from '../../models/Center.js';

import { GEOCODER_PAUSE_MS as PAUSE_BETWEEN_LOOKUPS_MS, GEOCODER_TIMEOUT_MS as REQUEST_TIMEOUT_MS, GEOCODER_RETRY_AFTER_DAYS as RETRY_AFTER_DAYS } from '../../config/geocoding.js';
/**
 * Position géographique d'un centre, trouvée à partir de son NOM.
 *
 * Géocodeur : Nominatim (OpenStreetMap), sans clé. Sa politique d'usage demande un identifiant (User-Agent) et au plus
 * une requête par seconde : les recherches se font donc l'une après l'autre, avec une pause, et le résultat est
 * enregistré sur le centre (`Center.location`) pour ne chercher qu'une fois. Un nom introuvable est mémorisé
 * (`locationLookupFailedAt`) et n'est retenté qu'après RETRY_AFTER_DAYS jours.
 *
 * Variables d'environnement (facultatives) :
 *   GEOCODER_URL         adresse de recherche (défaut : https://nominatim.openstreetmap.org/search)
 *   GEOCODER_USER_AGENT  identifiant envoyé au géocodeur (défaut : Celeste-app/1.0)
 */
const GEOCODER_URL = () => process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = () => process.env.GEOCODER_USER_AGENT || 'Celeste-app/1.0';

/** Les noms de centres désignent souvent un aéroport ou une ville : on essaie le nom, puis « aéroport <nom> » */
const queriesFor = (name) => [name, `aéroport ${name}`];

/**
 * Cherche les coordonnées d'un nom de lieu.
 *
 * @param {string} name - nom du centre
 * @param {{ fetchFn?: typeof fetch }} [options] - `fetchFn` : pour les tests
 * @returns {Promise<{ latitude: number, longitude: number, displayName: string }|null>} null si rien n'est trouvé
 */
export async function geocodeName (name, { fetchFn = fetch } = {}) {
    for (const query of queriesFor(String(name).trim())) {
        const url = new URL(GEOCODER_URL());
        url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1' }).toString();

        const response = await fetchFn(url, {
            headers: { 'User-Agent': USER_AGENT(), Accept: 'application/json' },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`Géocodeur : HTTP ${response.status}`);

        const [best] = await response.json();
        const latitude = Number(best?.lat);
        const longitude = Number(best?.lon);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            return { latitude, longitude, displayName: best.display_name ?? query };
        }
    }
    return null;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const retryLimit = () => new Date(Date.now() - RETRY_AFTER_DAYS * 24 * 60 * 60 * 1000);

let lookupInProgress = null;

/**
 * Cherche la position des centres qui n'en ont pas, un par un, et l'enregistre. Sans effet si une recherche est déjà
 * en cours. À lancer sans attendre (`void ensureCenterLocations()`) : elle ne renvoie rien et ne lève jamais.
 *
 * @param {{ fetchFn?: typeof fetch, pauseMs?: number }} [options] - pour les tests
 * @returns {Promise<number>} nombre de centres localisés pendant cet appel
 */
export function ensureCenterLocations ({ fetchFn = fetch, pauseMs = PAUSE_BETWEEN_LOOKUPS_MS } = {}) {
    if (lookupInProgress) return lookupInProgress;

    lookupInProgress = (async () => {
        let located = 0;
        try {
            const centers = await Center.find({
                deleted: false,
                'location.latitude': { $exists: false },
                $or: [{ locationLookupFailedAt: { $exists: false } }, { locationLookupFailedAt: { $lt: retryLimit() } }],
            }).select('name');

            for (const [index, center] of centers.entries()) {
                if (index > 0) await wait(pauseMs);
                try {
                    const found = await geocodeName(center.name, { fetchFn });
                    await Center.updateOne(
                        { _id: center._id },
                        found
                            ? { $set: { location: { ...found, geocodedAt: new Date() } }, $unset: { locationLookupFailedAt: '' } }
                            : { $set: { locationLookupFailedAt: new Date() } }
                    );
                    if (found) located++;
                } catch (error) {
                    // Erreur réseau ou du géocodeur : on réessaiera à la prochaine ouverture de la carte
                    console.error(`Géocodage du centre « ${center.name} » impossible :`, error.message);
                }
            }
        } catch (error) {
            console.error('Recherche de la position des centres impossible :', error.message);
        } finally {
            lookupInProgress = null;
        }
        return located;
    })();

    return lookupInProgress;
}
