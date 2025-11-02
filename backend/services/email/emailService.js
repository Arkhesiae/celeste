import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Service d'email unifié qui gère différents fournisseurs selon MAIL_SERVICE
 */

const mailService = process.env.MAIL_SERVICE || 'console';
const isDevelopment = process.env.NODE_ENV !== 'production';



/**
 * Crée un transporteur Amazon SES
 */
function createSESTransporter() {
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

function createBulkSESTransporter() {
  return nodemailer.createTransport({
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
}

/**
 * Crée un transporteur console pour les tests
 */
function createConsoleTransporter() {
  return {
    sendMail: async (mailOptions) => {

      if (mailOptions.html) {
        // console.log('   Contenu HTML disponible');
      }
      if (mailOptions.text) {
        // console.log('   Contenu texte:', mailOptions.text.substring(0, 100) + '...');
      }
      return { messageId: 'dev-message-id' };
    },
    close: () => console.log('🔧 Transporteur de développement fermé')
  };
}



/**
 * Crée un transporteur selon le service configuré
 */
function createTransporter(bulk = false) {
  // En développement, on utilise un transporteur de test
  if (isDevelopment) {
    return createConsoleTransporter();
  }

  if (bulk) {
    return createBulkSESTransporter();
  }

  return createSESTransporter();

}

/**
 * Envoie un email avec le service configuré
 */
async function sendEmail(mailOptions) {
  const transporter = createTransporter();
  try {
    const result = await transporter.sendMail(mailOptions);
    result.sent = true;
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email :', error);
    return { sent: false, error: error.message };
  } finally {
    if (transporter.close) {
      transporter.close();
    }
  }
}

/**
 * Envoie un email avec le service configuré
 */
async function sendMassEmail(mailOptionsList) {
  const transporter = createTransporter(true);
  const results = {
    total: mailOptionsList.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  for (const mailOptions of mailOptionsList) {
    try {
      await transporter.sendMail(mailOptions);
      results.sent++;
      console.log('📧 Email envoyé à:', mailOptions.to);
    } catch (error) {
      results.failed++;
      results.errors.push({ email: mailOptions.to, error: error.message });
    }
  }
  if (transporter.close) {
    transporter.close();
  }
  return results;
}



/**
 * Envoie un email en masse
 */
async function sendBulkEmail(emails, mailOptions) {
  const transporter = createTransporter(true);

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
  sendBulkEmail,
  sendMassEmail
}; 