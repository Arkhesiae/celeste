/**
 * Point d'entrée du domaine « substitution » pour le code extérieur à `services/` (contrôleurs, jobs, serveur, scripts).
 * À l'intérieur de `services/`, on importe le fichier voulu directement (pas de barrel : il créerait des cycles).
 */
export * from './request.accept.js';
export * from './request.cancel.js';
export * from './request.cascade.js';
export * from './request.creation.js';
export * from './request.delete.js';
export * from './request.expiry.js';
export * from './request.list.js';
export * from './request.pendingTransactions.js';
export * from './request.reminder.js';
export * from './request.withdraw.js';
export * from './substitution.compatibility.js';
export * from './substitution.heatmap.js';
export * from './substitution.switches.js';
export * from './substitution.userPool.js';
