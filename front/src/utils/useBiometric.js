import { NativeBiometric } from '@capgo/capacitor-native-biometric'

/**
 * Vérifie si la biométrie est disponible et authentifie l'utilisateur.
 * @returns {Promise<boolean>} true si succès, false sinon.
 */
export async function useBiometricLogin() {
  try {
    const availability = await NativeBiometric.isAvailable()

    if (!availability.isAvailable) {
      console.warn('Biométrie non disponible sur cet appareil')
      return false
    }

    const result = await NativeBiometric.verifyIdentity({
      reason: 'Authentifie-toi pour accéder à Celeste',
      title: 'Connexion biométrique',
      subtitle: 'Appuie sur le capteur',
      description: 'Utilise ton empreinte ou ton visage',
    })

    if (result.verified) {
      console.log('Authentification biométrique réussie')
      return true
    } else {
      console.warn('Authentification biométrique refusée')
      return false
    }
  } catch (error) {
    console.error('Erreur biométrie :', error)
    return false
  }
}
