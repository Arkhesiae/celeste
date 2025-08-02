import emailService from './emailService.js';

/**
 * Envoie un OTP par email via le service configuré
 * @param {string} toEmail
 * @param {string} otp
 */
async function sendEmailOtp(toEmail, otp) {
  const mailOptions = {
    from: 'Celeste <otp@celeste-app.fr>',
    to: toEmail,
    subject: 'Votre code OTP - Celeste',
    text: `Bonjour,\n\nVoici votre code OTP : ${otp}\nIl est valable 5 minutes.\n\nCordialement,\nL'équipe Celeste`
  };

  try {
    await emailService.sendEmail(mailOptions);
    console.log('📧 Email OTP envoyé à:', toEmail);
  } catch (err) {
    console.error('❌ Erreur envoi OTP :', err);
    throw err;
  }
}

export { sendEmailOtp }; 