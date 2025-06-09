import { NativeBiometric } from '@capacitor-community/native-biometric';
import { Haptics } from '@capacitor/haptics';

export const useBiometrics = () => {
  const isBiometricsAvailable = async () => {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (error) {
      console.error('Erreur lors de la vérification de la biométrie:', error);
      return false;
    }
  };

  const authenticate = async () => {
    try {
      await Haptics.impact({ style: 'medium' });
      const result = await NativeBiometric.verifyIdentity({
        reason: 'Veuillez vous authentifier',
        title: 'Authentification',
        subtitle: 'Utilisez votre biométrie pour vous connecter',
        description: 'Placez votre doigt sur le capteur'
      });
      return result.verified;
    } catch (error) {
      console.error('Erreur lors de l\'authentification biométrique:', error);
      return false;
    }
  };

  const saveCredentials = async (username: string, password: string) => {
    try {
      await NativeBiometric.setCredentials({
        username,
        password,
        server: 'remplacer.app'
      });
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des identifiants:', error);
      return false;
    }
  };

  const getCredentials = async () => {
    try {
      const credentials = await NativeBiometric.getCredentials({
        server: 'remplacer.app'
      });
      return credentials;
    } catch (error) {
      console.error('Erreur lors de la récupération des identifiants:', error);
      return null;
    }
  };

  return {
    isBiometricsAvailable,
    authenticate,
    saveCredentials,
    getCredentials
  };
}; 