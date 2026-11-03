import Substitution from '../../../models/Substitution.js';
import User from '../../../models/User.js';
import emailService from '../emailService.js';
import { renderMail } from '../../../src/mail/mailRenderer.js';
import { formatDateFr, sendCancelledAcceptanceEmail } from './demandEmails.js';

/**
 * Notifications envoyées aux tiers touchés quand une demande de substitution est annulée ou qu'un accepteur
 * en est retiré en dehors d'une action directe de leur part (changement d'équipe, changement de tour de service).
 * Les emails sont volontairement génériques : ils ne précisent ni la cause ni que l'opération est automatique.
 *  - retrait d'un accepteur → l'auteur reçoit l'email « acceptation annulée » (cancelledAcceptance), le même que
 *    lorsque l'accepteur se désiste lui-même
 *  - annulation → l'auteur et/ou l'accepteur reçoivent l'email « demande annulée » (demandCancelled), cascade comprise
 *
 * À appeler APRÈS le commit de la transaction : un rollback n'envoie donc aucun email. Ne lève jamais :
 * une panne d'envoi ne doit pas faire échouer l'opération métier.
 */

const FROM = 'Celeste <notification@celeste-app.fr>';

const TYPE_TEXT = { switch: 'Permutation', hybrid: 'Hybride', substitution: 'Remplacement' };

const shortName = (user) => {
    if (!user) return null;
    const initial = user.lastName ? `${user.lastName.slice(0, 1)}.` : '';
    return `${user.name ?? ''} ${initial}`.trim() || null;
};

const idOf = (value) => String(value?._id ?? value);

/**
 * @param {Object} params
 * @param {Array<string|ObjectId>} [params.cancelledIds] - demandes annulées (cascade comprise)
 * @param {Array<{ demandId, accepterId }>} [params.withdrawn] - demandes rouvertes après retrait d'un accepteur
 * @param {string|ObjectId} [params.actorId] - utilisateur à l'origine du changement : jamais notifié
 * @returns {Promise<{ sent: number }>}
 */
export async function notifyDemandChanges ({ cancelledIds = [], withdrawn = [], actorId } = {}) {
    try {
        const ids = [...new Set([...cancelledIds, ...withdrawn.map((w) => w.demandId)].map(String))];
        if (!ids.length) return { sent: 0 };

        const [demands, accepters] = await Promise.all([
            Substitution.find({ _id: { $in: ids } }).populate([
                { path: 'posterId', select: 'name lastName email' },
                { path: 'accepterId', select: 'name lastName email' },
            ]),
            User.find({ _id: { $in: [...new Set(withdrawn.map((w) => String(w.accepterId)))] } }).select('name lastName'),
        ]);

        const demandById = new Map(demands.map((d) => [idOf(d), d]));
        const accepterById = new Map(accepters.map((u) => [idOf(u), u]));
        const skip = actorId ? idOf(actorId) : null;
        const isRecipient = (user) => user?.email?.trim() && !(skip && idOf(user) === skip);

        let sent = 0;

        // Accepteur retiré → l'auteur est prévenu que sa demande est de nouveau ouverte
        for (const { demandId, accepterId } of withdrawn) {
            const demand = demandById.get(String(demandId));
            const accepter = accepterById.get(String(accepterId));
            if (!demand || !accepter || !isRecipient(demand.posterId)) continue;
            try {
                await sendCancelledAcceptanceEmail(demand, accepter);
                sent += 1;
            } catch (error) {
                console.error('❌ Erreur envoi email de retrait :', error);
            }
        }

        // Demande annulée → l'auteur et l'accepteur (s'il y en avait un), chacun avec l'autre comme interlocuteur
        const mails = [];
        const addMail = (to, subject, data, text) => {
            if (!isRecipient(to)) return;
            mails.push({ to: to.email, from: FROM, subject, html: renderMail('systemCancel', { userName: to.name, ...data }), text });
        };

        for (const id of new Set(cancelledIds.map(String))) {
            const demand = demandById.get(id);
            if (!demand) continue;
            const date = formatDateFr(demand.posterShift.date);
            const posterName = shortName(demand.posterId);
            const accepterName = shortName(demand.accepterId);
            const common = { typeText: TYPE_TEXT[demand.type], posterShiftDate: date };

            addMail(
                demand.posterId,
                'Votre demande a été annulée',
                { ...common, role: 'poster', counterpartName: accepterName },
                `Bonjour ${demand.posterId?.name ?? ''},\n\nVotre demande du ${date} a été annulée.${accepterName ? `\n\n${accepterName} ne vous remplace plus.` : ''}\n\nCordialement,\nL'équipe Celeste`
            );
            addMail(
                demand.accepterId,
                'Une demande que vous aviez acceptée a été annulée',
                { ...common, role: 'accepter', counterpartName: posterName },
                `Bonjour ${demand.accepterId?.name ?? ''},\n\nLa demande de ${posterName} du ${date}, que vous aviez acceptée, a été annulée.\n\nVous n'êtes plus engagé(e) sur cette vacation.\n\nCordialement,\nL'équipe Celeste`
            );
        }

        if (mails.length) await emailService.sendMassEmail(mails);
        sent += mails.length;

        console.log(`📧 Notifications de changement de demandes : ${sent} email(s)`);
        return { sent };
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi des notifications de changement de demandes :', error);
        return { sent: 0, error: error.message };
    }
}
