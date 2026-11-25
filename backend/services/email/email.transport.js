import nodemailer from 'nodemailer';

/**
 * Les mails partent-ils vraiment ? En production (`NODE_ENV=production`) toujours, par Amazon SES, quelle que soit la valeur de `MAIL_SERVICE`
 * (un fichier d'environnement copié de `.env.example` y porte `console` : il ne doit pas couper les mails). Ailleurs ils sont seulement affichés
 * dans la console, sauf si `MAIL_SERVICE` vaut autre chose que `console` (par exemple `ses`) : un serveur de test qui doit envoyer pour de
 * bon n'a pas besoin de `NODE_ENV=production`. Lu à chaque envoi.
 */
const usesConsole = () => {
  if (process.env.NODE_ENV === 'production') return false;
  const service = process.env.MAIL_SERVICE;
  return !service || service === 'console';
};

/** Port du serveur SMTP, le même pour l'envoi unitaire et l'envoi en masse (587 par défaut) */
const smtpPort = () => parseInt(process.env.EMAIL_PORT || '587', 10);

/**
 * Crée un transporteur Amazon SES
 */
function createSESTransporter() {
  console.log("🔍 Creating SES transporter...");
  console.log("🔍 SES_HOST:", process.env.SES_HOST);
  console.log("🔍 EMAIL_PORT:", smtpPort());

  return nodemailer.createTransport({
    host: process.env.SES_HOST,
    port: smtpPort(),
    secure: false,
    auth: {
      user: process.env.SES_USERNAME,
      pass: process.env.SES_PASSWORD,
    }
  });
}

function createBulkSESTransporter() {
  console.log("🔍 Creating bulk SES transporter...");
  console.log("🔍 SES_HOST:", process.env.SES_HOST);
  console.log("🔍 EMAIL_PORT:", smtpPort());

  return nodemailer.createTransport({
    pool: true,
    maxConnections: 1,
    maxMessages: 5,
    host: process.env.SES_HOST,
    port: smtpPort(),
    secure: false, // TLS, pas SSL
    auth: {
      user: process.env.SES_USERNAME,
      pass: process.env.SES_PASSWORD,
    }
  });
}

/**
 * Transporteur « console » (développement, tests, `MAIL_SERVICE=console`) : rien ne part, mais l'envoi est dit simulé dans la console et dans le
 * résultat (`simulated: true`), pour qu'un serveur qui n'envoie rien ne passe pas pour un serveur qui envoie.
 */
function createConsoleTransporter() {
  return {
    sendMail: async (mailOptions) => {
      console.log(`📪 Mail simulé (aucun envoi réel) : à ${[].concat(mailOptions.to).join(', ')} — ${mailOptions.subject}`);
      return { messageId: 'dev-message-id', simulated: true };
    },
    close: () => console.log('🔧 Transporteur de développement fermé')
  };
}



/**
 * Crée un transporteur selon le service configuré
 */
function createTransporter(bulk = false) {
  if (usesConsole()) {
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



export { sendEmail, sendBulkEmail, sendMassEmail };
