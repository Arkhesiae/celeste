import emailService from '../email.transport.js';
import { posterDayOf, shiftDayOf } from '../../../utils/dates/dayAccess.js';
import { formatDateFr } from '../../../utils/dates/format.js';
import { shortName } from '../../../utils/names.js';
import { renderMail } from '../mailRenderer.js';
import { getEffectiveShiftTimes } from '../../../utils/shifts/getEffectiveShiftTimes.js';


/**
 * Envoie un email de notification aux utilisateurs du pool concernant une demande publiée
 * @param {Array} userPool - Liste des utilisateurs du pool (doit contenir email, name, lastName, canSwitch, canReplace)
 * @param {Object} demandeur - L'utilisateur qui a posté la demande
 * @param {Object} demand - La demande de substitution
 * @param {string} shiftDay - Le jour du shift concerné
 * @returns {Object} Résultat de l'envoi
 */
async function sendUserPoolNotification(userPool, demand) {
  try {
    // Filtrer les utilisateurs avec des emails valides
    const validUsers = userPool.filter(user => user.email && user.email.trim());

    if (validUsers.length === 0) {
      console.log('⚠️ Aucun email valide trouvé dans le pool d\'utilisateurs');
      return;
    }

    // Utiliser les informations peuplées de l'utilisateur
    const posterName = demand.posterId?.name || 'Utilisateur';
    const posterLastName = demand.posterId?.lastName.slice(0, 1) + '.' || '';
    const fullName = `${posterName} ${posterLastName}`.trim();

    const typeText = () => {
      switch (demand.type) {
        case "switch":
          return "Permutation";
        case "hybrid":
          return "Hybride";
        case "substitution":
          return "Remplacement";
        default:
          return demand.type;
      }
    }
    const subject = `Nouvelle demande - ${typeText()}`;

    const acceptedSwitches = demand.acceptedSwitches.map(switchItem => ({
      shift: switchItem.shift.name,
      points: switchItem.points,
      startTime: switchItem.shift.default.startTime,
      endTime: switchItem.shift.default.endTime,
    }));

    const posterShift = demand.posterShift;
    const baseName = posterShift?.shift?.name || '';
    let variationName = null;
    if (posterShift?.selectedVariation) {
      if (typeof posterShift.selectedVariation === 'object' && posterShift.selectedVariation?.name) {
        variationName = posterShift.selectedVariation.name;
      } else if (posterShift.shift?.variations?.length) {
        const vid = (posterShift.selectedVariation?._id || posterShift.selectedVariation)?.toString?.();
        const v = posterShift.shift.variations.find(x => (x._id || x)?.toString?.() === vid);
        variationName = v?.name || null;
      }
    }
    const shiftDisplayName = variationName ? baseName + variationName : baseName;
    const effectiveTimes = getEffectiveShiftTimes(posterShift?.shift, posterShift?.selectedVariation) || posterShift?.shift?.default;

    const mailOptionsList = [];
    // Envoyer un email personnalisé pour chaque utilisateur
    for (const user of validUsers) {
      try {


        // Données du template personnalisées pour chaque utilisateur (variante affichée seulement si choisie)
        const templateData = {
          userName: user.name,
          demandType: demand.type,
          typeText: typeText(),
          acceptedSwitches: acceptedSwitches,
          posterName: fullName,
          teamName: demand.posterShift.teamId.name,
          demandDate: formatDateFr(posterDayOf(demand)),
          shift: shiftDisplayName,
          startTime: effectiveTimes?.startTime || demand.posterShift.shift?.default?.startTime,
          endTime: effectiveTimes?.endTime || demand.posterShift.shift?.default?.endTime,
          comment: demand.comment,
          points: demand.points,
          canSwitch: user.canSwitch || false,
          canReplace: user.canReplace || false,
        };

        const text = `
Bonjour ${user.name},

${fullName} a posté une nouvelle demande.

Vous faites partie du pool d'utilisateurs pouvant potentiellement accepter cette demande.

Connectez-vous à l'application pour plus d'informations et pour accepter la demande si elle vous intéresse.

Cordialement,
L'équipe Celeste
  `.trim();

        const html = renderMail('availableDemand', templateData);



        // Préparer les options d'email personnalisées pour cet utilisateur
        mailOptionsList.push({
          to: user.email,
          from: 'Celeste <notification@celeste-app.fr>',
          subject: subject,
          html: html,
          text: text
        });



      } catch (error) {
        console.error(`❌ Erreur envoi email à ${user.email}:`, error);
      }
    }
    const results = await emailService.sendMassEmail(mailOptionsList);
    return results;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des notifications au pool d\'utilisateurs:', error);
    throw error;
  }
}

/**
 * Envoie un email de notification aux utilisateurs du pool concernant une demande publiée
 * @param {Array} userPool - Liste des utilisateurs du pool (doit contenir email, name, lastName)
 * @param {Object} demandeur - L'utilisateur qui a posté la demande
 * @param {Object} demand - La demande de substitution
 * @param {string} shiftDay - Le jour du shift concerné
 * @returns {Object} Résultat de l'envoi
 */
async function sendAcceptedDemandEmail (demand) {
  try {
    const accepterName = demand.accepterId?.name;
    const accepterLastName = demand.accepterId?.lastName?.slice(0, 1) + '.';
    const fullName = `${accepterName} ${accepterLastName}`;
    const subject = `Votre demande a été acceptée par ${fullName}`;
    const text = `
Bonjour ${demand.posterId.name},

Bonne nouvelle, ${fullName} a accepté votre demande de remplacement pour le ${formatDateFr(posterDayOf(demand))}.

N'oubliez pas de déclarer ce remplacement sur OLAFATCO.

Cordialement,
L'équipe Celeste
  `.trim();


    const typeText = () => {
      switch (demand.type) {
        case "switch":
          return "Permutation";
        case "hybrid":
          return "Hybride";
        case "substitution":
          return "Remplacement";
        default:
          return demand.type;
      }
    }

    const templateData = {
      userName: demand.posterId.name,
      accepterName: fullName,
      posterShift: demand.posterShift.shift.name,
      posterShiftDate: formatDateFr(posterDayOf(demand)),
      creationDate: formatDateFr(demand.createdAt),
      typeText: typeText(),
      accepterShift: demand.accepterShift?.shift?.name,
      accepterTeam: demand.accepterShift?.teamId?.name,
    }

    const html = renderMail('acceptedDemand', templateData);

    // Préparer les options d'email

    const mailOptions = {
      to: demand.posterId.email,
      from: 'Celeste <notification@celeste-app.fr>',
      subject: subject,
      html: html,
      text: text
    };

    // Envoyer les emails en masse
    const results = await emailService.sendEmail(mailOptions);

    return results;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des notifications au pool d\'utilisateurs:', error);
    throw error;
  }
}


/**
 * Envoie un email de notification aux utilisateurs du pool concernant une demande publiée
 * @param {Array} userPool - Liste des utilisateurs du pool (doit contenir email, name, lastName)
 * @param {Object} demandeur - L'utilisateur qui a posté la demande
 * @param {Object} demand - La demande de substitution
 * @param {string} shiftDay - Le jour du shift concerné
 * @returns {Object} Résultat de l'envoi
 */
async function sendCancelledAcceptanceEmail(demand, originalAccepter) {
  try {
    const fullName = shortName(originalAccepter) ?? '';
    const subject = `${fullName} a annulé son acceptation`;
    const text = `
Bonjour ${demand.posterId.name},

${fullName} ne vous remplace plus pour votre demande le ${formatDateFr(posterDayOf(demand))}.

Votre demande est à nouveau visible pour d'autres collègues.

Cordialement, 
L'équipe Celeste
  `.trim();

    const typeText = () => {
      switch (demand.type) {
        case "switch":
          return "Permutation";
        case "hybrid":
          return "Hybride";
        case "substitution":
          return "Remplacement";
        default:
          return demand.type;
      }
    }

    const templateData = {
      typeText: typeText(),
      userName: demand.posterId.name,
      accepterName: fullName,
      posterShiftDate: formatDateFr(posterDayOf(demand)),
    }


    const html = renderMail('cancelledAcceptance', templateData);

    // Préparer les options d'email

    const mailOptions = {
      to: demand.posterId.email,
      from: 'Celeste <notification@celeste-app.fr>',
      subject: subject,
      html: html,
      text: text
    };

    // Envoyer les emails en masse
    const results = await emailService.sendEmail(mailOptions);

    return results;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des notifications au pool d\'utilisateurs:', error);
    throw error;
  }
}


/**
 * Envoie à l'accepteur le rappel de la veille d'un remplacement / d'une permutation.
 * @param {Object} demand - Demande acceptée, avec posterId (name, lastName), accepterId (name, email),
 *   posterShift.shift (+ variations), posterShift.selectedVariation, posterShift.teamId (name) et accepterShift.shift (name) peuplés
 * @returns {Promise<Object>} Résultat de l'envoi ({ sent: false } en cas d'échec : emailService.sendEmail ne lève pas)
 */
async function sendReplacementReminderEmail (demand) {
  const accepter = demand.accepterId;
  const posterName = shortName(demand.posterId) ?? '';

  // Une permutation = l'accepteur a fourni sa propre vacation ; sinon c'est un remplacement
  const exchangedShift = demand.accepterShift?.shift?.name ?? null;
  const effectiveTypeText = exchangedShift ? 'Permutation' : 'Remplacement';
  const effectiveTypeLower = exchangedShift ? 'une permutation' : 'un remplacement';

  const posterShift = demand.posterShift;
  const selectedVariation = posterShift?.selectedVariation;
  let variationName = null;
  if (selectedVariation && typeof selectedVariation === 'object' && selectedVariation.name) {
    variationName = selectedVariation.name;
  } else if (selectedVariation && posterShift?.shift?.variations?.length) {
    const vid = (selectedVariation._id || selectedVariation).toString();
    variationName = posterShift.shift.variations.find((v) => (v._id || v).toString() === vid)?.name ?? null;
  }
  const shiftName = (posterShift?.shift?.name ?? '') + (variationName ?? '');
  const times = getEffectiveShiftTimes(posterShift?.shift, selectedVariation) || posterShift?.shift?.default;
  const date = formatDateFr(shiftDayOf(posterShift, 'Substitution.posterShift.day'));

  const templateData = {
    userName: accepter.name,
    posterName,
    effectiveTypeText,
    effectiveTypeLower,
    exchangedShift,
    // données de la carte `demand`
    demandDate: date,
    typeText: effectiveTypeText,
    demandType: exchangedShift ? 'switch' : 'substitution',
    shift: shiftName,
    startTime: times?.startTime,
    endTime: times?.endTime,
    teamName: posterShift?.teamId?.name,
    points: demand.points,
  };

  const text = `
Bonjour ${accepter.name},

Rappel : demain (${date}), vous êtes engagé(e) pour ${effectiveTypeLower} avec ${posterName} : ${shiftName}${times ? ` (${times.startTime} - ${times.endTime})` : ''}.${exchangedShift ? `\nEn échange, ${posterName} effectue votre vacation habituelle (${exchangedShift}).` : ''}

Un empêchement ? Retirez-vous de la demande depuis l'application dès que possible.

Cordialement,
L'équipe Celeste
  `.trim();

  return emailService.sendEmail({
    to: accepter.email,
    from: 'Celeste <notification@celeste-app.fr>',
    subject: `Rappel : votre ${effectiveTypeText.toLowerCase()} de demain`,
    html: renderMail('replacementReminder', templateData),
    text,
  });
}


export {
  sendUserPoolNotification,
  sendAcceptedDemandEmail,
  sendCancelledAcceptanceEmail,
  sendReplacementReminderEmail
};
