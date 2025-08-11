import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Envoie un email de notification à une liste d'utilisateurs pour informer qu'un utilisateur a posté une demande.
 * Utilise un pool SMTP pour envoyer 5 emails par connexion.
 * @param {string[]} userEmails - Liste des emails des destinataires
 * @param {Object} demandeur - L'utilisateur qui a posté la demande (doit contenir name et lastName)
 * @param {string} shiftDay - Le jour du shift concerné
 * @param {number} numberOfPoints - Nombre de points proposés
 * @param {string|Date} date - Date de la demande
 */
async function sendBulkDemandNotification(userEmails, demandeur, shiftDay, numberOfPoints, date) {
  const transporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 1,
    maxMessages: 5,
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: false, // TLS, pas SSL
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    }
  });
  
  const { subject, html, text } = buildNewDemandEmail(demandeur, shiftDay, numberOfPoints, date);


  for (const toEmail of userEmails) {
    const mailOptions = {
      from: 'Celeste <notification@celeste-app.fr>',
      to: toEmail,
      subject,
      html,
      text
    };
    try {
      await transporter.sendMail(mailOptions);
      console.log('📧 Notification envoyée à:', toEmail);
    } catch (err) {
      console.error('❌ Erreur envoi notification à', toEmail, ':', err);
    }
  }

  // Fermer le pool après l'envoi
  transporter.close();
}

export { sendBulkDemandNotification };
