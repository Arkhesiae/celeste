/**
 * Point d'entrée du domaine « user » pour le code extérieur à `services/` (contrôleurs, jobs, serveur, scripts).
 * À l'intérieur de `services/`, on importe le fichier voulu directement (pas de barrel : il créerait des cycles).
 */
export * from './user.account.js';
export * from './user.create.js';
export * from './user.list.js';
export * from './user.points.js';
export * from './user.profile.js';
export * from './user.sanitizePeriod.js';
export * from './user.shifts.js';
export * from './user.team.js';
export * from './user.teamRead.js';
export * from './user.teamTimeline.js';
export * from './user.workCheck.js';
