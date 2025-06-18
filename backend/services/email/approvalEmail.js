import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Envoie un OTP par email via AWS SES + Nodemailer
 * @param {string} toEmail
 * @param {string} otp
 */
async function sendEmailApproval(toEmail) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: false, // TLS, pas SSL
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: 'Votre inscription à été approuvée - Celeste',
    text: `Bonjour,\n\nVotre inscription à été approuvée. Vous pouvez désormais accéder à l'application.\n\nCordialement,\nL'équipe Celeste`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email approbation envoyé :', info.messageId);
  } catch (err) {
    console.error('❌ Erreur envoi approbation :', err);
    throw err;
  }
}

async function sendEmailRejection(toEmail) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: false, // TLS, pas SSL
        auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD,
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: toEmail,
        subject: 'Votre inscription à été rejetée - Celeste',
        text: `Bonjour,\n\nVotre inscription à été rejetée. Veuillez réessayer ou contacter l'administrateur du site.\n\nCordialement,\nL'équipe Celeste`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email rejet envoyé :', info.messageId);
    } catch (err) {
        console.error('❌ Erreur envoi rejet :', err);
        throw err;
    }
}

export { sendEmailApproval, sendEmailRejection }; 