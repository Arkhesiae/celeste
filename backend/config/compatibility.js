/**
 * Réglages du calcul de compatibilité des demandes (planning de l'utilisateur et exploration des variantes).
 */

/** Jours avant / après le jour d'une demande chargés dans le planning : fenêtres glissantes de 7 jours (±6) + marge pour les nuits */
export const SHIFT_MAP_DAY_RADIUS = 12;

/** Exploration des variantes (services/substitution/compatibility/compatibility.variations.js), optionnelle : la combinatoire explose vite, d'où ces bornes */
export const MAX_COMPATIBILITY_COMBOS = 128;   // nombre maximal d'évaluations
export const AMBIGUOUS_DAY_RADIUS = 7;         // un jour plus éloigné de la demande n'est pas exploré
export const MAX_AMBIGUOUS_DATES = 4;          // nombre maximal de jours explorés (les plus proches)
