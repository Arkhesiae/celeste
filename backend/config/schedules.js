/**
 * Tâches planifiées (node-cron) et rappels.
 */

/** Expressions cron des jobs (`jobs/`) */
export const REMINDER_CRON = '5 * * * *';          // toutes les heures, à la minute 5
export const REQUEST_JOB_CRON = '*/30 * * * *';    // toutes les 30 minutes : demandes passées / terminées
export const TRANSACTION_JOB_CRON = '*/30 * * * *'; // toutes les 30 minutes : transferts de points différés

/** Heure locale (du centre) à partir de laquelle on envoie le rappel de la veille d'un remplacement, si REMINDER_HOUR n'est pas défini */
export const DEFAULT_REMINDER_HOUR = 18;
