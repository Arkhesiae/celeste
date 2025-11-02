import emailService from './emailService.js';
import { renderMail } from '../../src/mail/mailRenderer.js';


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

    const mailOptionsList = [];
    // Envoyer un email personnalisé pour chaque utilisateur
    for (const user of validUsers) {
      try {


        // Données du template personnalisées pour chaque utilisateur
        const templateData = {
          userName: user.name,
          demandType: demand.type,
          typeText: typeText(),
          acceptedSwitches: acceptedSwitches,
          posterName: fullName,
          teamName: demand.posterShift.teamId.name,
          demandDate: formatDateFr(demand.posterShift.date),
          shift: demand.posterShift.shift.name,
          startTime: demand.posterShift.shift.default.startTime,
          endTime: demand.posterShift.shift.default.endTime,
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
async function sendAcceptedDemandEmail(demand) {
  try {
    const accepterName = demand.accepterId?.name;
    const accepterLastName = demand.accepterId?.lastName?.slice(0, 1) + '.';
    const fullName = `${accepterName} ${accepterLastName}`;
    const subject = `Votre demande a été acceptée par ${fullName}`;
    const text = `
Bonjour ${demand.posterId.name},

Bonne nouvelle, ${fullName} a accepté votre demande de remplacement pour le ${formatDateFr(demand.posterShift.date)}.

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
      posterShiftDate: formatDateFr(demand.posterShift.date),
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
    const fullName = `${originalAccepter.name} ${originalAccepter.lastName?.slice(0, 1) + '.'}`;
    const subject = `${fullName} a annulé son acceptation`;
    const text = `
Bonjour ${demand.posterId.name},

${fullName} ne vous remplace plus pour votre demande le ${formatDateFr(demand.posterShift.date)}.

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
      posterShiftDate: formatDateFr(demand.posterShift.date),
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
 * Formate une date en français
 * @param {Date|string} date - Date à formater
 * @returns {string} Date formatée
 */
function formatDateFr(date) {
  const d = (typeof date === 'string') ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}



export {
  sendUserPoolNotification,
  sendAcceptedDemandEmail,
  sendCancelledAcceptanceEmail
};
