/**
 * Point d'entrée du domaine « email » pour le code extérieur à `services/` (contrôleurs, jobs, serveur, scripts).
 * À l'intérieur de `services/`, on importe le fichier voulu directement (pas de barrel : il créerait des cycles).
 */
export * from './email.adminNotification.js';
export * from './email.announcement.js';
export * from './email.approval.js';
export * from './email.inbound.js';
export * from './email.transport.js';
export * from './email.renderer.js';
export * from './email.newTicket.js';
export * from './email.otp.js';
export * from './email.resetPassword.js';
export * from './email.ticketReply.js';
export * from './demand/demand.changeNotifications.js';
export * from './demand/demand.emails.js';
