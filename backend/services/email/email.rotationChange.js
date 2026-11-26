import User from '../../models/User.js';
import Center from '../../models/Center.js';
import Rotation from '../../models/Rotation.js';
import * as emailService from './email.transport.js';
import { renderMail } from './email.renderer.js';
import { formatDateFr } from '../../utils/dates/format.js';

/**
 * Mail « nouveau tour de service » aux utilisateurs d'un centre, quand une activation ajoutée change le tour en vigueur à partir
 * d'une date. Seuls les comptes vérifiés, actifs et n'ayant pas coupé les mails le reçoivent. À appeler APRÈS le commit ; ne lève jamais.
 *
 * @param {{ centerId, rotationId, previousRotationId?, day: string, demandsAffected: boolean }} change - `day` : YYYY-MM-DD
 */
export async function notifyRotationChange ({ centerId, rotationId, previousRotationId = null, day, demandsAffected }) {
    try {
        const users = await User.find({
            centerId,
            registrationStatus: 'verified',
            isActive: { $ne: false },
            'preferences.emails.all': { $ne: false },
        }).select('name email').lean();
        const recipients = users.filter((user) => user.email?.trim());
        if (!recipients.length) return { sent: 0 };

        const [center, rotation, previous] = await Promise.all([
            Center.findById(centerId).select('name').lean(),
            Rotation.findById(rotationId).select('name days').lean(),
            previousRotationId ? Rotation.findById(previousRotationId).select('name').lean() : null,
        ]);
        const common = {
            centerName: center?.name,
            rotationName: rotation?.name,
            activationDate: formatDateFr(day),
            previousRotationName: previous?.name,
            daysCount: rotation?.days?.length || undefined,
            demandsAffected,
        };

        await emailService.sendMassEmail(recipients.map((user) => ({
            from: 'Celeste <notification@celeste-app.fr>',
            to: user.email,
            subject: `Nouveau tour de service à partir du ${common.activationDate}`,
            html: renderMail('rotationChange', { ...common, userName: user.name }),
            text: `Bonjour ${user.name},\n\nLe tour de service « ${common.rotationName} » du centre ${common.centerName} entre en vigueur le ${common.activationDate}${previous ? `, à la place de « ${previous.name} »` : ''}.\n\nVotre planning est recalculé à partir de cette date : consultez-le dans Céleste.\n\nCordialement,\nL'équipe Celeste`,
        })));
        return { sent: recipients.length };
    } catch (error) {
        console.error('❌ Erreur envoi email de changement de tour de service :', error);
        return { sent: 0, error: error.message };
    }
}
