/**
 * Géocodage du nom des centres (services/center/center.geocode.js), pour la carte du tableau de bord.
 */
export const GEOCODER_PAUSE_MS = 1100;       // pause entre deux recherches : la politique de Nominatim demande au plus 1 par seconde
export const GEOCODER_TIMEOUT_MS = 8000;
export const GEOCODER_RETRY_AFTER_DAYS = 7;  // un nom introuvable n'est retenté qu'après ce délai
