import emailService from './emailService.js';

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

/**
 * Envoie un email de notification aux utilisateurs du pool concernant une demande publiée
 * @param {Array} userPool - Liste des utilisateurs du pool (doit contenir email, name, lastName)
 * @param {Object} demandeur - L'utilisateur qui a posté la demande
 * @param {Object} demand - La demande de substitution
 * @param {string} shiftDay - Le jour du shift concerné
 * @returns {Object} Résultat de l'envoi
 */
async function sendUserPoolNotification(userPool, demand) {
  try {
    // Extraire les emails des utilisateurs du pool
    const userEmails = userPool
      .filter(user => user.email && user.email.trim())
      .map(user => user.email);

    if (userEmails.length === 0) {
      console.log('⚠️ Aucun email valide trouvé dans le pool d\'utilisateurs');
      return {
        total: 0,
        sent: 0,
        failed: 0,
        errors: []
      };
    }

    // Générer le contenu de l'email
    const { subject, html, text } = buildUserPoolNotificationEmail(demand);

    // Préparer les options d'email
    const mailOptions = {
      from: 'Celeste <notification@celeste-app.fr>',
      subject,
      html,
      text
    };

    // Envoyer les emails en masse
    const results = await emailService.sendBulkEmail(userEmails, mailOptions);

    console.log(`📧 Notifications envoyées au pool d'utilisateurs:`, {
      totalUsers: userPool.length,
      emailsSent: results.sent,
      emailsFailed: results.failed,
      demandId: demand._id,
      demandType: demand.type
    });

    return results;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des notifications au pool d\'utilisateurs:', error);
    throw error;
  }
}



export {
  sendUserPoolNotification,
  buildUserPoolNotificationEmail
};
