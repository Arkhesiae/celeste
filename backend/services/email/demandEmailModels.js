/**
 * Génère les modèles d'emails liés aux demandes : acceptée, annulée, acceptation annulée.
 * @module demandsTemplates
 */



/**
 * Email : Demande acceptée par un remplaçant
 * @param {Object} demandeur - Utilisateur ayant créé la demande
 * @param {Object} remplacant - Utilisateur ayant accepté la demande
 * @param {string} shiftDay - Jour du shift
 * @param {number} numberOfPoints - Points proposés
 * @param {string|Date} date - Date de création
 * @returns {{subject: string, html: string, text: string}}
 */
function buildAcceptedDemandEmail(demand) {
  const formattedDate = formatDateFr(demand.createdAt);
  const subject = `Votre demande a été acceptée par ${demand.accepterId.name} ${demand.accepterId.lastName}`;

  const text = `
Bonjour ${demand.posterId.name},

Bonne nouvelle, ${demand.accepterId.name} ${demand.accepterId.lastName} a accepté votre demande de remplacement le ${formatDateFr(demand.posterShift.date)} (créée le ${formattedDate}).

N'oubliez pas de déclarer ce remplacement sur OLAFATCO.

Cordialement,
L'équipe Celeste
  `.trim();

  const html = `
<div style="font-family: Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px;">
  <h2 style="text-align:center; color:#333;">Demande acceptée</h2>
  <p>Bonjour ${demand.posterId.name},</p>
  <p><strong>${demand.accepterId.name} ${demand.accepterId.lastName}</strong> a accepté votre demande de remplacement le ${formatDateFr(demand.posterShift.date)} (créée le ${formattedDate}).</p>
  <p>N'oubliez pas de déclarer ce remplacement sur OLAFATCO.</p>
  <hr/>
  <p style="color:#999; font-size:12px;">Cet email est généré automatiquement. Ne pas répondre.</p>
</div>
  `.trim();

  return { subject, html, text };
}


/**
 * Email : Acceptation annulée par le remplaçant
 * @param {Object} demandeur - Utilisateur ayant créé la demande
 * @param {Object} remplacant - Utilisateur qui annule son acceptation
 * @param {string} shiftDay - Jour du shift
 * @param {string|Date} date - Date de création
 * @returns {{subject: string, html: string, text: string}}
 */
  function buildCancelledAcceptanceEmail(demand, originalAccepter) {
  const formattedDate = formatDateFr(demand.createdAt);
  const subject = `${originalAccepter.name} ${originalAccepter.lastName} a annulé son acceptation`;

  const text = `
Bonjour ${demand.posterId.name},

${originalAccepter.name} ${originalAccepter.lastName} ne vous remplace plus pour votre demande le ${formatDateFr(demand.posterShift.date)} (créée le ${formattedDate}).

Votre demande est à nouveau visible pour d'autres collègues.

Cordialement, 
L'équipe Celeste
  `.trim();

  const html = `
<div style="font-family: Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px;">
  <h2 style="text-align:center; color:#333;">Acceptation annulée</h2>
  <p>Bonjour ${demand.posterId.name},</p>
  <p><strong>${originalAccepter.name} ${originalAccepter.lastName}</strong> ne vous remplace plus pour votre demande le ${formatDateFr(demand.posterShift.date)} (créée le ${formattedDate}).</p>
  <p>Votre demande est désormais à nouveau visible pour d'autres collègues.</p>
  <hr/>
  <p style="color:#999; font-size:12px;">Cet email est généré automatiquement. Ne pas répondre.</p>
</div>
  `.trim();

  return { subject, html, text };
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


/**
 * Génère le contenu de l'email de notification pour le pool d'utilisateurs
 * @param {Object} demandeur - L'utilisateur qui a posté la demande
 * @param {Object} demand - La demande de substitution
 * @param {string} shiftDay - Le jour du shift concerné
 * @returns {{subject: string, html: string, text: string}}
 */
function buildUserPoolNotificationEmail(demand) {
  const formattedDate = formatDateFr(demand.createdAt);

  
  // Utiliser les informations peuplées de l'utilisateur
  const posterName = demand.posterId?.name || 'Utilisateur';
  const posterLastName = demand.posterId?.lastName || '';
  const fullName = `${posterName} ${posterLastName}`.trim();
  
  const subject = `Nouvelle demande ${demand.type} - ${fullName}`;

  // Déterminer le type de demande pour l'affichage
  let demandTypeText = '';
  switch (demand.type) {
    case 'switch':
      demandTypeText = 'Échange de shift';
      break;
    case 'hybrid':
      demandTypeText = 'Remplacement ou échange';
      break;
    case 'substitution':
      demandTypeText = 'Remplacement';
      break;
    default:
      demandTypeText = 'Remplacement';
  }

  // Formater la date du shift
  const shiftDay = formatDateFr(demand.posterShift.date);

  const text = `
Bonjour,

${fullName} a posté une nouvelle demande.

Détails de la demande :
- Type : ${demandTypeText}
- Jour : ${shiftDay}
- Heures : ${demand.posterShift.startTime} - ${demand.posterShift.endTime}
- Vacation : ${demand.posterShift.name}
- Points proposés : ${demand.points}
- Date de création : ${formattedDate}
${demand.comment ? `- Commentaire : ${demand.comment}` : ''}

Vous faites partie du pool d'utilisateurs pouvant potentiellement accepter cette demande.

Connectez-vous à l'application pour plus d'informations et pour accepter la demande si elle vous intéresse.

Cordialement,
L'équipe Celeste
  `.trim();

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  
  <div style="background: ; color: black; margin-bottom: 32px ; margin-top: 32px; border-radius: 10px 10px 0 0; text-align: start;">
          <h1 style="margin: 0; font-size: 28px;">Nouvelle demande</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 16px; border: 1px solid rgba(0, 0, 0, 0.012);">
          
    
    <p style="color: #666; line-height: 1.6;">
      <strong>${fullName}</strong> a posté une nouvelle demande.
    </p>
          <div style="background: #f0f4f6; border: 1px solid #e9ecef01; border-radius: 8px; padding: 24px; margin: 25px 0; ">
            <div style="margin-right: 10px; display: flex; align-items: start; justify-content: start; flex-direction: column;">
            <h3 style=" color:rgb(22, 18, 21);">Détails de la demande</h3>
            <ul style="color: #666; line-height: 1.6; font-size: 15px; margin: 0; padding-left: 20px;">
        <li><strong>Type :</strong> ${demandTypeText}</li>
        <li><strong>Jour :</strong> ${shiftDay}</li>
        <li><strong>Heures :</strong> ${demand.posterShift.startTime} - ${demand.posterShift.endTime}</li>
        <li><strong>Vacation :</strong> ${demand.posterShift.name}</li>
        <li><strong>Points proposés :</strong> ${demand.points}</li>
        <li><strong>Date de création :</strong> ${formattedDate}</li>
        ${demand.comment ? `<li><strong>Commentaire :</strong> ${demand.comment}</li>` : ''}
      </ul>
           
            </div>
          </div>
          <div style="background-color: #f0f4f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <p style="color: #493662; margin: 0; font-weight: 500; opacity: 0.8;">
        🎯 Vous faites partie du pool d'utilisateurs pouvant potentiellement accepter cette demande.
      </p>
    </div>
    <p style="color: #666; line-height: 1.6;">
      Connectez-vous à l'application pour plus d'informations et pour accepter la demande si elle vous intéresse.
    </p>    
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Merci d'utiliser Celeste !
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Cordialement,<br>
            L'équipe Celeste
          </p>
        </div>
  
  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="color: #999; font-size: 12px;">
      Cet email a été envoyé automatiquement, merci de ne pas y répondre.<br>
      Cordialement,<br>
      L'équipe Celeste
    </p>
  </div>
</div>
  `.trim();

  return { subject, html, text };
}


export {
  buildAcceptedDemandEmail,
  buildUserPoolNotificationEmail,
  buildCancelledAcceptanceEmail,
    };
