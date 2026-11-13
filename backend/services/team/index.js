/**
 * Point d'entrée du domaine « team » pour le code extérieur à `services/` (contrôleurs, jobs, serveur, scripts).
 * À l'intérieur de `services/`, on importe le fichier voulu directement (pas de barrel : il créerait des cycles).
 */
export * from './team.atDay.js';
export * from './team.cycle.js';
export * from './team.cycleIndex.js';
export * from './team.grid.js';
export * from './team.segments.js';
