import User from '../models/User.js';
import Center from '../models/Center.js';
import Substitution from '../models/Substitution.js';

/**
 * Contrôleur pour gérer les statistiques de l'application.
 * @module statController
 */
/**
 * Récupère toutes les statistiques de l'application.
 * @param {Object} req - La requête Express.
 * @param {Object} res - La réponse Express.
 */
export const getStats = async (req, res, next) => {
  try {
    // Compter le nombre total d'utilisateurs
    const totalUsers = await User.countDocuments();
    
    // Compter le nombre total de centres
    const totalCenters = await Center.countDocuments();
    
    // Compter le nombre total de substitutions
    const totalSubstitutions = await Substitution.countDocuments();

    res.json({
      success: true,
      data: {
        totalUsers,
        totalCenters,
        totalSubstitutions
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    next(error);
  }
};

