import emailService from './emailService.js';

/**
 * Construit le contenu de l'email de notification pour les administrateurs
 * @param {Object} newUser - Le nouvel utilisateur créé
 * @param {Object} center - Le centre de l'utilisateur
 * @returns {Object} Objet contenant subject, html et text
 */
function buildAdminNotificationEmail(newUser, center) {
  const subject = `🔔 Nouvelle inscription en attente d'approbation - ${center.name}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
            .user-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .button { 
                display: inline-block; 
                background-color: #007bff; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 10px 0;
            }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🔔 Nouvelle inscription en attente d'approbation</h2>
                <p>Un nouvel utilisateur s'est inscrit et nécessite votre approbation.</p>
            </div>
            
            <div class="content">
                <h3>Informations du nouvel utilisateur :</h3>
                <div class="user-info">
                    <p><strong>Nom complet :</strong> ${newUser.name} ${newUser.lastName}</p>
                    <p><strong>Email :</strong> ${newUser.email}</p>
                    <p><strong>Centre :</strong> ${center.name} (${center.OACI})</p>
                    <p><strong>Date d'inscription :</strong> ${new Date(newUser.createdAt).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Statut :</strong> <span style="color: #ffc107; font-weight: bold;">En attente d'approbation</span></p>
                </div>
                
                <p>Veuillez vous connecter à l'interface d'administration pour examiner et approuver cette inscription.</p>
                
                
            </div>
            
            <div class="footer">
                <p>Cet email a été envoyé automatiquement par le système Celeste.</p>
                <p>Si vous ne souhaitez plus recevoir ces notifications, contactez l'équipe technique.</p>
            </div>
        </div>
    </body>
    </html>
  `;
  
  const text = `
🔔 Nouvelle inscription en attente d'approbation - ${center.name}

Un nouvel utilisateur s'est inscrit et nécessite votre approbation.

Informations du nouvel utilisateur :
- Nom complet : ${newUser.name} ${newUser.lastName}
- Email : ${newUser.email}
- Centre : ${center.name} (${center.OACI})
- Date d'inscription : ${new Date(newUser.createdAt).toLocaleDateString('fr-FR')}
- Statut : En attente d'approbation

Veuillez vous connecter à l'interface d'administration pour examiner et approuver cette inscription.

Lien vers l'administration : ${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/users

---
Cet email a été envoyé automatiquement par le système Celeste.
Si vous ne souhaitez plus recevoir ces notifications, contactez l'équipe technique.
  `;
  
  return { subject, html, text };
}

/**
 * Envoie un email de notification aux administrateurs d'un centre
 * @param {Array} adminEmails - Liste des emails des administrateurs
 * @param {Object} newUser - Le nouvel utilisateur créé
 * @param {Object} center - Le centre de l'utilisateur
 * @returns {Object} Résultat de l'envoi
 */
async function sendAdminNotificationEmail(adminEmails, newUser, center) {
  try {
    if (!adminEmails || adminEmails.length === 0) {
      console.log('⚠️ Aucun administrateur trouvé pour le centre:', center.name);
      return {
        total: 0,
        sent: 0,
        failed: 0,
        errors: []
      };
    }

    // Générer le contenu de l'email
    const { subject, html, text } = buildAdminNotificationEmail(newUser, center);

    // Préparer les options d'email
    const mailOptions = {
      from: 'Celeste <notification@celeste-app.fr>',
      subject,
      html,
      text
    };

    // Envoyer les emails en masse
    const results = await emailService.sendBulkEmail(adminEmails, mailOptions);

    console.log(`📧 Notifications envoyées aux administrateurs:`, {
      centerName: center.name,
      centerId: center._id,
      totalAdmins: adminEmails.length,
      emailsSent: results.sent,
      emailsFailed: results.failed,
      newUserId: newUser._id,
      newUserEmail: newUser.email
    });

    return results;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des notifications aux administrateurs:', error);
    throw error;
  }
}

export { sendAdminNotificationEmail };
