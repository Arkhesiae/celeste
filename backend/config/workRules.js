/**
 * Règles de repos et de charge de travail appliquées au calcul de compatibilité des demandes
 * (services/planning/categorizeDemand.js ; description : docs/architecture/demand-categorization.md).
 */
export const MIN_REST_MINUTES = 11 * 60;                   // repos entre deux vacations
export const WEEKLY_REST_MINUTES = 35 * 60;                // un repos continu d'au moins 35h dans chaque période de 7 jours
export const MAX_WEEKLY_WORK_MINUTES = 48 * 60;            // au plus 48h de travail dans chaque période de 7 jours
export const MAX_CONSECUTIVE_WORK_DAYS = 5;
export const MIN_REST_AFTER_NIGHT_MINUTES = 12 * 60;       // après une vacation de contrôle de nuit
export const MAX_CONSECUTIVE_NIGHT_CONTROLS = 2;
export const MIN_REST_AFTER_TWO_NIGHTS_MINUTES = 48 * 60;  // après deux contrôles de nuit consécutifs
/** Nombre de périodes de 7 jours glissantes qui contiennent le jour cible : celles qui commencent de J-6 à J+6 */
export const WEEKLY_WINDOWS = 13;
