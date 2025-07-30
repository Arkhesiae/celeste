/**
 * Génère les modèles d'emails liés aux demandes : acceptée, annulée, acceptation annulée.
 * @module demandsTemplates
 */

function formatDateFr(date) {
  const d = (typeof date === 'string') ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

/**
 * Email : Demande acceptée par un remplaçant
 * @param {Object} demandeur - Utilisateur ayant créé la demande
 * @param {Object} remplacant - Utilisateur ayant accepté la demande
 * @param {string} shiftDay - Jour du shift
 * @param {number} numberOfPoints - Points proposés
 * @param {string|Date} date - Date de création
 * @returns {{subject: string, html: string, text: string}}
 */
function buildAcceptedDemandEmail(demandeur, remplacant, shiftDay, numberOfPoints, date) {
  const formattedDate = formatDateFr(date);
  const subject = `Votre demande a été acceptée par ${remplacant.name} ${remplacant.lastName}`;

  const text = `
Bonjour ${demandeur.name},

Bonne nouvelle, ${remplacant.name} ${remplacant.lastName} a accepté votre demande de remplacement.

Détails :
- Jour du shift : ${shiftDay}
- Points échangés : ${numberOfPoints}
- Date de création : ${formattedDate}

Vous pouvez maintenant confirmer l'échange dans l'application.

Cordialement,
L'équipe Celeste
  `.trim();

  const html = `
<div style="font-family: Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px;">
  <h2 style="text-align:center; color:#333;">Demande acceptée</h2>
  <p>Bonjour ${demandeur.name},</p>
  <p><strong>${remplacant.name} ${remplacant.lastName}</strong> a accepté votre demande.</p>
  <ul>
    <li><strong>Jour du shift :</strong> ${shiftDay}</li>
    <li><strong>Points échangés :</strong> ${numberOfPoints}</li>
    <li><strong>Date de création :</strong> ${formattedDate}</li>
  </ul>
  <p>Connectez-vous à l'application pour confirmer l'échange.</p>
  <hr/>
  <p style="color:#999; font-size:12px;">Cet email est généré automatiquement. Ne pas répondre.</p>
</div>
  `.trim();

  return { subject, html, text };
}

/**
 * Email : Demande annulée par le demandeur
 * @param {Object} demandeur - Utilisateur ayant annulé la demande
 * @param {string} shiftDay - Jour du shift
 * @param {string|Date} date - Date de création
 * @returns {{subject: string, html: string, text: string}}
 */
function buildCancelledDemandEmail(demandeur, shiftDay, date) {
  const formattedDate = formatDateFr(date);
  const subject = `Demande annulée - ${demandeur.name} ${demandeur.lastName}`;

  const text = `
Bonjour,

${demandeur.name} ${demandeur.lastName} a annulé sa demande de remplacement pour le ${shiftDay} (créée le ${formattedDate}).

Vous pouvez consulter les autres demandes disponibles dans l'application.

Cordialement,
L'équipe Celeste
  `.trim();

  const html = `
<div style="font-family: Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px;">
  <h2 style="text-align:center; color:#333;">Demande annulée</h2>
  <p><strong>${demandeur.name} ${demandeur.lastName}</strong> a annulé sa demande.</p>
  <ul>
    <li><strong>Jour du shift :</strong> ${shiftDay}</li>
    <li><strong>Date de création :</strong> ${formattedDate}</li>
  </ul>
  <p>Consultez l'application pour voir les autres demandes en cours.</p>
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
function buildCancelledAcceptanceEmail(demandeur, remplacant, shiftDay, date) {
  const formattedDate = formatDateFr(date);
  const subject = `${remplacant.name} ${remplacant.lastName} a annulé son acceptation`;

  const text = `
Bonjour ${demandeur.name},

${remplacant.name} ${remplacant.lastName} a annulé son acceptation de votre demande pour le ${shiftDay} (créée le ${formattedDate}).

Votre demande est à nouveau visible pour d'autres collègues.

Cordialement,
L'équipe Celeste
  `.trim();

  const html = `
<div style="font-family: Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px;">
  <h2 style="text-align:center; color:#333;">Acceptation annulée</h2>
  <p>Bonjour ${demandeur.name},</p>
  <p><strong>${remplacant.name} ${remplacant.lastName}</strong> a annulé son acceptation.</p>
  <ul>
    <li><strong>Jour du shift :</strong> ${shiftDay}</li>
    <li><strong>Date de création :</strong> ${formattedDate}</li>
  </ul>
  <p>Votre demande est désormais à nouveau visible pour d'autres collègues.</p>
  <hr/>
  <p style="color:#999; font-size:12px;">Cet email est généré automatiquement. Ne pas répondre.</p>
</div>
  `.trim();

  return { subject, html, text };
}

function buildNewDemandEmail(demandeur, shiftDay, numberOfPoints, date) {
  const formattedDate = formatDateFr(date);
  
  const subject = `Nouvelle demande de remplacement - ${demandeur.name} ${demandeur.lastName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color:rgb(00, 0, 0);">Celeste</h2>
      </div>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h3 style="color: #333; margin-top: 0;">Nouvelle demande de remplacement</h3>
        <p style="color: #666; line-height: 1.6;">
          Bonjour,<br><br>
          <strong>${demandeur.name} ${demandeur.lastName}</strong> a posté une nouvelle demande de remplacement.
        </p>
        <ul style="color: #666; line-height: 1.6; font-size: 15px;">
          <li><strong>Jour du shift :</strong> ${shiftDay}</li>
          <li><strong>Nombre de points :</strong> ${numberOfPoints}</li>
          <li><strong>Date :</strong> ${formattedDate}</li>
        </ul>
        <p style="color: #666; line-height: 1.6;">
          Connectez-vous à l'application pour plus d'informations.
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
  `;

  const text = `Bonjour,\n\n${demandeur.name} ${demandeur.lastName} a posté une nouvelle demande de remplacement.\n\nDétails :\n- Jour du shift : ${shiftDay}\n- Nombre de points : ${numberOfPoints}\n- Date : ${formattedDate}\n\nConnectez-vous à l'application pour plus d'informations.\n\nCet email a été envoyé automatiquement, merci de ne pas y répondre.\nCordialement,\nL'équipe Celeste`;
  return { subject, html, text };
}

export {
  buildAcceptedDemandEmail,
  buildCancelledDemandEmail,
  buildCancelledAcceptanceEmail,
  buildNewDemandEmail
};
