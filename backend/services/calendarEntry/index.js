/**
 * Point d'entrée du domaine « calendarEntry » pour le code extérieur à `services/` (contrôleurs, jobs, serveur, scripts).
 * À l'intérieur de `services/`, on importe le fichier voulu directement (pas de barrel : il créerait des cycles).
 */
export * from './calendarEntry.cancel.js';
export * from './calendarEntry.read.js';
export * from './calendarEntry.register.js';
