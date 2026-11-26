import User from '../../models/User.js';
import Center from '../../models/Center.js';
import * as emailService from './email.transport.js';
import { renderMail } from './email.renderer.js';

/**
 * Mail « mutation acceptée » à l'utilisateur qui change de centre. À appeler APRÈS le commit ; ne lève jamais. Rien n'est envoyé à
 * un utilisateur sans adresse, désactivé ou ayant coupé les mails.
 */
export async function notifyCenterTransferAccepted (userId, previousCenterId) {
    try {
        const user = await User.findById(userId).select('name email isActive preferences centerId').lean();
        if (!user?.email?.trim() || user.isActive === false || user.preferences?.emails?.all === false) return { sent: 0 };

        const [center, previousCenter] = await Promise.all(
            [user.centerId, previousCenterId].map((id) => Center.findById(id).select('name').lean()),
        );
        const data = { userName: user.name, centerName: center?.name, previousCenterName: previousCenter?.name };

        await emailService.sendEmail({
            from: 'Celeste <notification@celeste-app.fr>',
            to: user.email,
            subject: 'Votre mutation est acceptée',
            html: renderMail('centerTransferAccepted', data),
            text: `Bonjour ${user.name},\n\nVotre demande de changement de centre a été acceptée : vous faites désormais partie du centre ${data.centerName}.\n\nVous n'êtes plus rattaché(e) à une équipe, votre solde de points repart de 0, et vos demandes et entrées de planning à venir dans l'ancien centre ont été annulées.\n\nCordialement,\nL'équipe Celeste`,
        });
        return { sent: 1 };
    } catch (error) {
        console.error('❌ Erreur envoi email de mutation acceptée :', error);
        return { sent: 0, error: error.message };
    }
}
