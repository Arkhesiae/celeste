import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();


/**
 * Envoie un email de réinitialisation de mot de passe
 * @param {string} toEmail - Email de l'utilisateur
 * @param {string} resetLink - Lien de réinitialisation
 * @param {string} userName - Nom de l'utilisateur (optionnel)
 */
async function sendPasswordResetEmail(toEmail, resetLink, userName = '') {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: false, // TLS, pas SSL
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    }
  });

  const greeting = userName ? `Bonjour ${userName},` : 'Bonjour,';
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: 'Réinitialisation de votre mot de passe - Celeste',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #1976d2;">Celeste</h2>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">Réinitialisation de mot de passe</h3>
          
          <p style="color: #666; line-height: 1.6;">
            ${greeting}
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            <strong>Important :</strong> Ce lien est valable pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.
          </p>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
            <a href="${resetLink}" style="color: #1976d2; word-break: break-all;">${resetLink}</a>
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
    `,
    text: `${greeting}

Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :

${resetLink}

Important : Ce lien est valable pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.

Cordialement,
L'équipe Celeste`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email de réinitialisation envoyé :', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Erreur envoi email de réinitialisation :', err);
    throw err;
  }
}

export { sendPasswordResetEmail }; 