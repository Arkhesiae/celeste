import PointTransfer from '../../models/PointTransfer.js';
import Demand from '../../models/Demand.js';
import * as emailService from './email.transport.js';
import { renderMail } from './email.renderer.js';
import { posterDayOf } from '../../utils/dates/dayAccess.js';
import { formatDateFr } from '../../utils/dates/format.js';
import { shortName } from '../../utils/names.js';
import { MIN_POINTS_BALANCE } from '../../config/points.js';

/**
 * Mails d'un transfert de points (`PointTransfer`), après coup :
 *  - transfert exécuté pour une demande acceptée : l'auteur (débit) et l'accepteur (crédit) reçoivent `pointsTransferDemand` ;
 *  - transfert manuel d'un utilisateur : seul le receveur est prévenu (`pointsTransferManual`), l'expéditeur l'a fait lui-même ;
 *  - transfert différé annulé (`pointsTransferCancelled`, avec sa raison) : les deux le sont, car rien n'a eu lieu.
 * Un utilisateur sans adresse, désactivé ou ayant coupé les mails (`preferences.emails.all`, ou la catégorie `points` si elle est
 * définie à false) n'en reçoit pas. À appeler APRÈS le commit ; ne lève jamais : une panne d'envoi ne doit pas faire échouer
 * l'opération sur les points.
 *
 * Raisons d'annulation (`reason`) : `demandNoLongerAccepted`, `insufficientBalance`, `centerTransfer`, `accountDeleted`, `cancelledByUser`
 * ou autre chose pour une erreur technique (voir le modèle `pointsTransferCancelled`).
 *
 * La demande annulée par l'utilisateur (`demand.pendingTransactions.js`) n'envoie pas de mail de points : les mails de la demande
 * (`systemCancel`, `cancelledDemand`, `withdrawal`) préviennent déjà les deux personnes.
 */

const FROM = 'Celeste <notification@celeste-app.fr>';
const TYPE_TEXT = { switch: 'Permutation', hybrid: 'Hybride', substitution: 'Remplacement' };
const USER_FIELDS = 'name lastName email isActive preferences points';

const wantsPointsMail = (user) => {
  const prefs = user?.preferences?.emails;
  return Boolean(user?.email?.trim()) && user.isActive !== false && prefs?.all !== false && prefs?.categories?.points !== false;
};

const REASON_TEXT = {
  demandNoLongerAccepted: "la demande à l'origine du transfert n'est plus acceptée",
  insufficientBalance: `le solde de l'expéditeur ne permettait pas le transfert (minimum autorisé : ${MIN_POINTS_BALANCE} points)`,
  centerTransfer: "un des deux utilisateurs a changé de centre",
  accountDeleted: "le compte de l'autre personne a été supprimé",
  cancelledByUser: "le transfert différé a été annulé avant son exécution",
};

/**
 * Fabrique les mails d'un transfert (fonction pure : pas d'accès à la base ni à l'envoi).
 * @param {Object} transaction - `PointTransfer` avec `sender` et `receiver` peuplés (name, lastName, email, isActive, preferences, points)
 * @param {Object} options
 * @param {'completed'|'cancelled'} options.event
 * @param {string} [options.reason] - raison de l'annulation
 * @param {Object} [options.demand] - demande liée au transfert (`type`, `posterShift.shift.name`, jour), pour le mail « demande »
 * @returns {Array<{ to: string, from: string, subject: string, html: string, text: string }>}
 */
export function buildPointTransferMails(transaction, { event, reason, demand } = {}) {
  const { sender, receiver, amount } = transaction;
  const linkedToDemand = Boolean(transaction.request);
  const roles = event === 'cancelled' || linkedToDemand ? ['receiver', 'sender'] : ['receiver'];
  const date = formatDateFr(transaction.effectiveDate);

  const mails = [];
  for (const role of roles) {
    const user = role === 'receiver' ? receiver : sender;
    if (!wantsPointsMail(user)) continue;
    const counterpart = role === 'receiver' ? sender : receiver;
    const counterpartName = shortName(counterpart) ?? 'Un collègue';
    const common = { userName: user.name, role, amount, counterpartName, date };
    const signed = `${role === 'receiver' ? '+' : '−'}${amount}`;

    let template;
    let data;
    let subject;
    let text;
    if (event === 'cancelled') {
      template = 'pointsTransferCancelled';
      data = { ...common, reason, minBalance: MIN_POINTS_BALANCE };
      subject = 'Transfert de points annulé';
      text = `Bonjour ${user.name},\n\nLe transfert de ${amount} points ${role === 'receiver' ? `de ${counterpartName} vers votre compte` : `vers ${counterpartName}`} a été annulé${REASON_TEXT[reason] ? ` : ${REASON_TEXT[reason]}` : ' : une erreur technique a empêché son exécution'}.\n\nAucun point n'a été débité ni crédité.\n\nCordialement,\nL'équipe Celeste`;
    } else if (linkedToDemand) {
      template = 'pointsTransferDemand';
      const demandDay = demand ? formatDateFr(posterDayOf(demand)) : '';
      data = {
        ...common,
        balance: user.points,
        demandDate: demandDay,
        shift: demand?.posterShift?.shift?.name,
        typeText: TYPE_TEXT[demand?.type],
      };
      subject = role === 'receiver' ? `Points reçus : ${signed}` : `Points débités : ${signed}`;
      text = `Bonjour ${user.name},\n\n${role === 'receiver' ? `${amount} points ont été crédités à votre solde` : `${amount} points ont été débités de votre solde`} (${transaction.description || 'demande acceptée'}, avec ${counterpartName}).\n\nNouveau solde : ${user.points} points.\n\nCordialement,\nL'équipe Celeste`;
    } else {
      template = 'pointsTransferManual';
      data = { ...common, balance: user.points, description: transaction.description };
      subject = `Vous avez reçu ${amount} points de ${counterpartName}`;
      text = `Bonjour ${user.name},\n\n${counterpartName} vous a transféré ${amount} points.${transaction.description ? `\n\nMessage : ${transaction.description}` : ''}\n\nNouveau solde : ${user.points} points.\n\nCordialement,\nL'équipe Celeste`;
    }

    mails.push({ to: user.email, from: FROM, subject, html: renderMail(template, data), text });
  }
  return mails;
}

async function notifyPointTransfer(transactionId, { event, reason }) {
  try {
    const transaction = await PointTransfer.findById(transactionId)
      .populate('sender', USER_FIELDS)
      .populate('receiver', USER_FIELDS);
    if (!transaction?.sender || !transaction.receiver) return { sent: 0 };

    const demand =
      event === 'completed' && transaction.request
        ? await Demand.findById(transaction.request).populate({ path: 'posterShift.shift', select: 'name' })
        : null;

    const mails = buildPointTransferMails(transaction, { event, reason, demand });
    if (mails.length) await emailService.sendMassEmail(mails);
    return { sent: mails.length };
  } catch (error) {
    console.error('❌ Erreur envoi email de transfert de points :', error);
    return { sent: 0, error: error.message };
  }
}

/** Prévient les personnes concernées qu'un transfert de points vient d'être exécuté (soldes déjà mis à jour) */
export const notifyPointTransferCompleted = (transactionId) => notifyPointTransfer(transactionId, { event: 'completed' });

/** Prévient les deux utilisateurs qu'un transfert de points n'aura pas lieu, avec la raison (voir plus haut) */
export const notifyPointTransferCancelled = (transactionId, reason) => notifyPointTransfer(transactionId, { event: 'cancelled', reason });
