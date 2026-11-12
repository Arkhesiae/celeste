/**
 * Limites de taille et de période acceptées par l'API.
 */

/** Taille maximale d'un corps de requête JSON / formulaire (known issue #11 : à réduire) */
export const REQUEST_BODY_LIMIT = '50mb';

/** Taille maximale d'un avatar téléversé */
export const AVATAR_MAX_BYTES = 10 * 1024 * 1024;

/** Période maximale (en jours) des requêtes par plage de dates */
export const DEMAND_HEATMAP_MAX_DAYS = 190;      // six mois
export const TEAM_GRID_MAX_DAYS = 93;            // trois périodes de 24 jours (précédente, courante, suivante) = 72 jours
export const TEAM_TIMELINE_MAX_DAYS = 800;
