import Otp from '../models/Otp.js';
import { sendEmailOtp } from '../services/email/otpEmail.js';
import crypto from 'crypto';

const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'L\'email est requis' });
    }

    // Générer un nouveau code OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Expire dans 5 minutes

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
      await sendEmailOtp(email, otp);
    }

    res.json({ message: 'Code OTP envoyé avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'OTP:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du code' });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'L\'email et le code OTP sont requis' });
    }

    // Rechercher l'OTP valide
    const otpRecord = await Otp.findOne({
      email,
      code: otp,
      expiresAt: { $gt: new Date() },
      isUsed: false
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Code OTP invalide ou expiré' });
    }

    // Marquer l'OTP comme utilisé
    otpRecord.isUsed = true;
    await otpRecord.save();

    res.json({ verified: true, message: 'Code OTP vérifié avec succès' });
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'OTP:', error);
    res.status(500).json({ message: 'Erreur lors de la vérification de l\'OTP' });
  }
};

export default {
  sendOtp,
  verifyOtp
}; 