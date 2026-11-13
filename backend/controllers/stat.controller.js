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

/**
 * Récupère le nombre total d'utilisateurs.
 * @param {Object} req - La requête Express.
 * @param {Object} res - La réponse Express.
 */
export const getTotalUsers = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    
    res.json({
      success: true,
      data: {
        totalUsers
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre d\'utilisateurs:', error);
    next(error);
  }
};

/**
 * Récupère le nombre total de centres.
 * @param {Object} req - La requête Express.
 * @param {Object} res - La réponse Express.
 */
export const getTotalCenters = async (req, res, next) => {
  try {
    const totalCenters = await Center.countDocuments();
    
    res.json({
      success: true,
      data: {
        totalCenters
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre de centres:', error);
    next(error);
  }
};

/**
 * Récupère le nombre total de substitutions.
 * @param {Object} req - La requête Express.
 * @param {Object} res - La réponse Express.
 */
export const getTotalSubstitutions = async (req, res, next) => {
  try {
    const totalSubstitutions = await Substitution.countDocuments();
    
    res.json({
      success: true,
      data: {
        totalSubstitutions
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre de substitutions:', error);
    next(error);
  }
};
