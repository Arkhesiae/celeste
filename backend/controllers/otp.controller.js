import Otp from '../models/Otp.js';
import { sendEmailOtp } from '../services/email/otpEmail.js';
import crypto from 'crypto';
import { AppError } from '../error/AppError.js';

const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('L\'email est requis', 400);
    }
    

    // Check if there is an OTP already for this email
    const existingOtp = await Otp.findOne({ email });

    if (existingOtp) {
      const timeSinceLastOtp = Math.floor((new Date() - existingOtp.createdAt) / 1000);
      const nextTryMinutes = Math.floor((10 * 60 - timeSinceLastOtp) / 60);
      const nextTrySeconds = (10 * 60 - timeSinceLastOtp) % 60;
      
      throw new AppError('Le code envoyé précédemment est toujours valide. Prochaine tentative dans ' + nextTryMinutes + 'm' + nextTrySeconds + 's', 400);
    }

    // Générer un nouveau code OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expire dans 10 minutes

    // Sauvegarder l'OTP dans la base de données
    await Otp.create({
      email,
      code: otp,
      expiresAt
    });

    // En mode développement, afficher le code dans la console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n=== MODE DÉVELOPPEMENT ===');
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Code OTP: ${otp}`);
      console.log('========================\n');
      
    } else {
      // En production, envoyer l'email
      await sendEmailOtp(email.toLowerCase(), otp);
    }

    res.json({ message: 'Code OTP envoyé avec succès' });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new AppError('L\'email et le code OTP sont requis', 400);
    }

    // Rechercher l'OTP valide
    const otpRecord = await Otp.findOne({
      email,
      code: otp,
      expiresAt: { $gt: new Date() },
      isUsed: false
    });

    if (!otpRecord) {
      throw new AppError('Code OTP invalide ou expiré', 400);
    }

    // Marquer l'OTP comme utilisé
    otpRecord.isUsed = true;
    await otpRecord.save();

    res.json({ verified: true, message: 'Code OTP vérifié avec succès' });
  } catch (error) {
    next(error);
  }
};

export default {
  sendOtp,
  verifyOtp
}; 