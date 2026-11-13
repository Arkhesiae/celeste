/**
 * Point d'entrée du domaine « email » pour le code extérieur à `services/` (contrôleurs, jobs, serveur, scripts).
 * À l'intérieur de `services/`, on importe le fichier voulu directement (pas de barrel : il créerait des cycles).
 */
export * from './adminNotificationEmail.js';
export * from './announcementEmail.js';
export * from './approvalEmail.js';
export * from './email.inbound.js';
export * from './email.transport.js';
export * from './mailRenderer.js';
export * from './newTicketEmail.js';
export * from './otpEmail.js';
export * from './resetPasswordEmail.js';
export * from './ticketReplyEmail.js';
export * from './demand/demandChangeNotifications.js';
export * from './demand/demandEmails.js';
