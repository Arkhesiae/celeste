import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Service d'email unifié qui gère différents fournisseurs selon MAIL_SERVICE
 */

console.log(process.env.MAIL_SERVICE);
const mailService = process.env.MAIL_SERVICE || 'console';
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Crée un transporteur MailerSend
 */
function createMailerSendTransporter() {
  console.log('📧 Configuration MailerSend SMTP');
  return nodemailer.createTransport({
    host: 'smtp.mailersend.net',
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAILERSEND_USERNAME,
      pass: process.env.MAILERSEND_PASSWORD,
    },
    tls: {
      ciphers: 'SSLv3'
    }
  });
}

/**
 * Crée un transporteur Amazon SES
 */
function createSESTransporter() {
  console.log('📧 Configuration Amazon SES SMTP');
  return nodemailer.createTransport({
    host: process.env.SES_HOST,
    port: parseInt(process.env.SES_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SES_USERNAME,
      pass: process.env.SES_PASSWORD,
    }
  });
}

/**
 * Crée un transporteur console pour les tests
 */
function createConsoleTransporter() {
  console.log('🔧 Mode développement : emails simulés avec console.log');
  return {
    sendMail: async (mailOptions) => {
      console.log('📧 [DEV] Email simulé :');
      console.log('   De:', mailOptions.from);
      console.log('   À:', mailOptions.to);
      console.log('   Sujet:', mailOptions.subject);
      if (mailOptions.html) {
        console.log('   Contenu HTML disponible');
      }
      if (mailOptions.text) {
        console.log('   Contenu texte:', mailOptions.text.substring(0, 100) + '...');
      }
      return { messageId: 'dev-message-id' };
    },
    close: () => console.log('🔧 Transporteur de développement fermé')
  };
}



/**
 * Crée un transporteur selon le service configuré
 */
function createTransporter() {
  // En développement, on utilise un transporteur de test

  console.log(isDevelopment);
  
  if (isDevelopment) {
    return createConsoleTransporter();
  }

  console.log(mailService);

  // Configuration selon le service choisi
  switch (mailService.toLowerCase()) {
    case 'mailersend':
      return createMailerSendTransporter();
    case 'ses':
    case 'amazon':
    case 'aws':
      return createSESTransporter();
    default:
      console.warn(`⚠️ Service d'email '${mailService}' non reconnu, utilisation du mode console`);
      return createConsoleTransporter();
  }
}

/**
 * Envoie un email avec le service configuré
 */
async function sendEmail(mailOptions) {
  const transporter = createTransporter();
  
  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Email envoyé avec succès à:', mailOptions.to);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email :', error);
    throw error;
  } finally {
    if (transporter.close) {
      transporter.close();
    }
  }
}

/**
 * Envoie un email en masse
 */
async function sendBulkEmail(emails, mailOptions) {
  const transporter = createTransporter();
  
  const results = {
    total: emails.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  for (const email of emails) {
    try {
      const emailOptions = {
        ...mailOptions,
        to: email
      };
      
      await transporter.sendMail(emailOptions);
      results.sent++;
      console.log('📧 Email envoyé à:', email);
    } catch (error) {
      results.failed++;
      results.errors.push({ email, error: error.message });
      console.error('❌ Erreur envoi email à', email, ':', error);
    }
  }

  if (transporter.close) {
    transporter.close();
  }

  return results;
}

export default {
  sendEmail,
  sendBulkEmail
}; 