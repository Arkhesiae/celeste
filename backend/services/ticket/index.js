/**
 * Point d'entrée du domaine « ticket » pour le code extérieur à `services/` (contrôleurs, jobs, serveur, scripts).
 * À l'intérieur de `services/`, on importe le fichier voulu directement (pas de barrel : il créerait des cycles).
 */
export * from './ticket.create.js';
export * from './ticket.delete.js';
export * from './ticket.read.js';
export * from './ticket.reply.js';
export * from './ticket.update.js';
