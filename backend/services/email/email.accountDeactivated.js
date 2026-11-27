import User from '../../models/User.js';
import Center from '../../models/Center.js';
import * as emailService from './email.transport.js';
import { renderMail } from './email.renderer.js';

/**
 * Mail « compte désactivé » à la personne dont le compte vient de l'être. À appeler APRÈS le commit ; ne lève jamais. Rien n'est
 * envoyé à un utilisateur sans adresse ou ayant coupé les mails.
 */
export async function notifyAccountDeactivated (userId) {
    try {
        const user = await User.findById(userId).select('name email preferences centerId').lean();
        if (!user?.email?.trim() || user.preferences?.emails?.all === false) return { sent: 0 };

        const centerName = (await Center.findById(user.centerId).select('name').lean())?.name;

        await emailService.sendEmail({
            from: 'Celeste <notification@celeste-app.fr>',
            to: user.email,
            subject: 'Votre compte est désactivé',
            html: renderMail('accountDeactivated', { userName: user.name, centerName }),
            text: `Bonjour ${user.name},\n\nVotre compte Céleste a été désactivé${centerName ? ` par l'administration du centre ${centerName}` : ''}. Vous ne pouvez plus vous connecter.\n\nVos demandes à venir ont été annulées, et vous avez été retiré(e) de celles que vous aviez acceptées.\n\nSi vous pensez qu'il s'agit d'une erreur, contactez l'administrateur de votre centre.\n\nCordialement,\nL'équipe Celeste`,
        });
        return { sent: 1 };
    } catch (error) {
        console.error('❌ Erreur envoi email de compte désactivé :', error);
        return { sent: 0, error: error.message };
    }
}
