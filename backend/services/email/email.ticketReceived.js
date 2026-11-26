import * as emailService from './email.transport.js';
import { renderMail } from './email.renderer.js';
import { formatDateFr } from '../../utils/dates/format.js';

const TICKET_TYPE_LABELS = { assistance: 'Assistance', review: 'Avis', other: 'Autre' };

/**
 * Accusé de réception d'un ticket. La création de ticket est publique : il ne part qu'à l'adresse d'un compte existant
 * (`user`), jamais à une adresse quelconque saisie dans le formulaire (sinon il servirait à envoyer des mails à n'importe qui).
 * L'objet porte `[CELESTE-<shortId>]` : une réponse à ce mail rejoint le ticket (voir email.inbound.js). Ne lève jamais.
 */
export async function notifyTicketReceived (ticket, user) {
    try {
        if (!user?.email?.trim() || user.isActive === false) return { sent: 0 };
        const data = {
            userName: user.name,
            ticketId: ticket.shortId,
            title: ticket.title,
            typeLabel: TICKET_TYPE_LABELS[ticket.type] ?? ticket.type,
            creationDate: formatDateFr(ticket.createdAt, { short: true }),
        };

        await emailService.sendEmail({
            from: 'Celeste <ticket@celeste-app.fr>',
            to: user.email,
            subject: `Ticket reçu [CELESTE-${ticket.shortId}]`,
            html: renderMail('ticketReceived', data),
            text: `Bonjour ${user.name},\n\nNous avons bien reçu votre ticket #${ticket.shortId} : ${ticket.title}.\n\nVous recevrez la réponse par e-mail. Pour ajouter une précision, répondez simplement à ce message.\n\nCordialement,\nL'équipe Celeste`,
            headers: { 'Reply-To': 'Celeste <ticket@celeste-app.fr>', 'X-Ticket-ID': ticket.shortId },
        });
        return { sent: 1 };
    } catch (error) {
        console.error("❌ Erreur envoi accusé de réception de ticket :", error);
        return { sent: 0, error: error.message };
    }
}
