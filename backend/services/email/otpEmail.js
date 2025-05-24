const nodemailer = require('nodemailer');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production'
    : '.env.development'
});

/**
 * Envoie un OTP par email via AWS SES + Nodemailer
 * @param {string} toEmail
 * @param {string} otp
 */
async function sendEmailOtp(toEmail, otp) {
  console.log("SMTP USER:", process.env.SMTP_USER);
  console.log("SMTP PASS:", process.env.SMTP_PASS);
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: false, // TLS, pas SSL
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: 'Votre code OTP - Celeste',
    text: `Bonjour,\n\nVoici votre code OTP : ${otp}\nIl est valable 5 minutes.\n\nCordialement,\nL'équipe Celeste`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email OTP envoyé :', info.messageId);
  } catch (err) {
    console.error('❌ Erreur envoi OTP :', err);
    throw err;
  }
}

module.exports = {
  sendEmailOtp
}; 