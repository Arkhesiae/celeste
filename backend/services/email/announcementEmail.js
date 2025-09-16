import emailService from './emailService.js';

/**
 * Templates d'emails d'annonce prédéfinis
 */
const EMAIL_TEMPLATES = {
  maintenance: {
    subject: 'Maintenance prévue - Celeste',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding-top: 40px; padding-bottom: 40px;">
        <div style="background: ; color: black; margin-bottom: 32px ; margin-top: 32px; border-radius: 10px 10px 0 0; text-align: start;">
          <h1 style="margin: 0; font-size: 28px;">Maintenance prévue</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 16px; border: 1px solid rgba(0, 0, 0, 0.012);">
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Bonjour,
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            ${data.message}
          </p>
          ${data.duration ? `
          <div style="background: #f0f4f6; border: 1px solid #e9ecef01; border-radius: 8px; padding: 24px; margin: 25px 0;">
            <div style="margin-right: 10px; display: flex; align-items: center; justify-content: start;">
            <h3 style=" color:rgb(22, 18, 21);">Durée estimée : </h3>
            <div style="color:rgb(0, 0, 0); font-weight: 400; margin-left: 10px;">
              ${data.duration}
            </div>
            </div>
            </p>
          </div>
          ` : ''}
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 25px;">
            Nous nous excusons pour la gêne occasionnée et vous remercions de votre compréhension.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 25px;">
            Cordialement,<br>
            L'équipe Celeste
          </p>
        </div>
      </div>
    `,
    text: (data) => `
Maintenance prévue - Celeste

Bonjour,

${data.message}

${data.duration ? `Durée estimée : ${data.duration}` : ''}

Nous nous excusons pour la gêne occasionnée et vous remercions de votre compréhension.

Cordialement,
L'équipe Celeste
    `
  },
  update: {
    subject: 'Nouvelle mise à jour - Celeste',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding-top: 40px; padding-bottom: 40px;">
        <div style="background: ; color: black; margin-bottom: 32px ; margin-top: 32px; border-radius: 10px 10px 0 0; text-align: start;">
          <h1 style="margin: 0; font-size: 28px;">Nouvelle mise à jour</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 16px; border: 1px solid rgba(0, 0, 0, 0.012);">
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Bonjour,
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Une nouvelle mise à jour de Celeste est disponible ! Rendez-vous sur la page patchnotes pour plus d'informations.
          </p>
          <div style="background: #f0f4f6; border: 1px solid #e9ecef01; border-radius: 8px; padding: 24px; margin: 25px 0; ">
            <div style="margin-right: 10px; display: flex; align-items: center; justify-content: start;">
            <h3 style=" color:rgb(22, 18, 21);">Sortie de la version </h3>
            <div style="color:rgb(0, 0, 0); font-weight: 400; margin-left: 10px;">
              ${data.message}
            </div>
            </div>
          </div>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Merci d'utiliser Celeste !
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Cordialement,<br>
            L'équipe Celeste
          </p>
        </div>
      </div>
    `,
    text: (data) => `
Nouvelle mise à jour - Celeste

Bonjour,

Une nouvelle mise à jour de Celeste est disponible !

Nouvelles fonctionnalités :
${data.message}

Merci d'utiliser Celeste !

Cordialement,
L'équipe Celeste
    `
  },
  general: {
    subject: 'Annonce - Celeste',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding-top: 40px">
        <div style="background: ; color: black; padding-top: 30px; padding-bottom: 30px;  border-radius: 10px 10px 0 0; text-align: start; display: flex; align-items: center; justify-content: start; gap: 10px;">
          <h1 style="margin: 0; font-size: 24px;">Annonce</h1>
           <div style="background:rgb(243, 215, 221); padding: 4px; border-radius: 12px;"> 
           <p style="font-size: 12px; line-height: 1.6; color: rgb(201, 15, 55);">
            IMPORTANT
          </p>
        </div>
        </div>
       
        <div style="background: #f8f9fa; padding: 30px; border-radius: 16px; border: 1px solid rgba(0, 0, 0, 0.012);">
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Bonjour,
          </p>
          <div style=" border: 1px solid #e9ecef01; border-radius: 8px;  margin: 25px 0;">
            <p style="font-size: 14px; line-height: 1.6; color: #333; margin: 0;">
              ${data.message}
            </p>
          </div>
          <p style="font-size: 12px; line-height: 1.6; font-weight: 600; color: #333;">
            Cordialement,<br>
            L'équipe Celeste
          </p>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="color: #999; font-size: 12px;">
      Cet email a été envoyé automatiquement, merci de ne pas y répondre.<br>
     
      L'équipe Celeste
    </p>
  </div>
        </div>
      </div>
    `,
    text: (data) => `
Annonce - Celeste

Bonjour,

${data.message}

Cordialement,
L'équipe Celeste
    `
  }
};

/**
 * Envoie un email d'annonce en masse à tous les utilisateurs
 * @param {string[]} userEmails - Liste des emails des destinataires
 * @param {string} templateType - Type de template ('maintenance', 'update', 'general')
 * @param {Object} data - Données pour le template
 * @returns {Object} Résultat de l'envoi
 */
async function sendBulkAnnouncementEmail(userEmails, templateType, data) {
  const template = EMAIL_TEMPLATES[templateType];
  if (!template) {
    throw new Error(`Template '${templateType}' non trouvé`);
  }

  const { subject, html, text } = {
    subject: template.subject,
    html: template.html(data),
    text: template.text(data)
  };

  const mailOptions = {
    from: 'Celeste <notification@celeste-app.fr>',
    subject,
    html,
    text
  };

  return await emailService.sendBulkEmail(userEmails, mailOptions);
}

/**
 * Récupère la liste des templates disponibles
 * @returns {Object} Liste des templates
 */
function getAvailableTemplates() {
  return Object.keys(EMAIL_TEMPLATES).map(key => ({
    value: key,
    label: getTemplateLabel(key),
    description: getTemplateDescription(key)
  }));
}

function getTemplateLabel(templateType) {
  const labels = {
    maintenance: 'Maintenance',
    update: 'Mise à jour',
    general: 'Annonce générale'
  };
  return labels[templateType] || templateType;
}

function getTemplateDescription(templateType) {
  const descriptions = {
    maintenance: 'Annoncer une maintenance prévue du système',
    update: 'Annoncer une nouvelle mise à jour avec nouvelles fonctionnalités',
    general: 'Annonce générale pour tous les utilisateurs'
  };
  return descriptions[templateType] || '';
}

export { 
  sendBulkAnnouncementEmail, 
  getAvailableTemplates,
  EMAIL_TEMPLATES 
};
