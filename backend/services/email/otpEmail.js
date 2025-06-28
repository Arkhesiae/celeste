import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Envoie un OTP par email via AWS SES + Nodemailer
 * @param {string} toEmail
 * @param {string} otp
 */
async function sendEmailOtp(toEmail, otp) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: false, // TLS, pas SSL
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    }
  });

  console.log("process.env.SMTP_USERNAME", process.env.SMTP_USERNAME);
  console.log("process.env.SMTP_PASSWORD", process.env.SMTP_PASSWORD);
  console.log("process.env.EMAIL_HOST", process.env.EMAIL_HOST);

  const mailOptions = {
    from: 'Celeste <otp@celeste-app.fr>',
    to: toEmail,
    subject: 'Votre code OTP - Celeste',
    text: `Bonjour,\n\nVoici votre code OTP : ${otp}\nIl est valable 5 minutes.\n\nCordialement,\nL'équipe Celeste`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📧 Email OTP envoyé à:', toEmail, ' :');
  } catch (err) {
    console.error('❌ Erreur envoi OTP :', err);
    throw err;
  }
}

export { sendEmailOtp }; 