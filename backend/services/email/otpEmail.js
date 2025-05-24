const nodemailer = require('nodemailer');

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
      user: process.env.AWS_ACCESS_KEY_ID,
      pass: process.env.AWS_SECRET_ACCESS_KEY,
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