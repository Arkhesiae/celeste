/**
 * Point d'entrée du domaine « rule » pour le code extérieur à `services/` (contrôleurs, jobs, serveur, scripts).
 * À l'intérieur de `services/`, on importe le fichier voulu directement (pas de barrel : il créerait des cycles).
 */
export * from './rule.initialize.js';
export * from './rule.predefined.js';
export * from './rule.service.js';
