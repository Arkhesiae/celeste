import User from '../models/User.js';
import Center from '../models/Center.js';
import Substitution from '../models/Substitution.js';

/**
 * Contrôleur pour gérer les statistiques de l'application.
 * @module statController
 */
const statController = {
  /**
   * Récupère toutes les statistiques de l'application.
   * @param {Object} req - La requête Express.
   * @param {Object} res - La réponse Express.
   */
  async getStats(req, res) {
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
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur lors de la récupération des statistiques'
      });
    }
  },

  /**
   * Récupère le nombre total d'utilisateurs.
   * @param {Object} req - La requête Express.
   * @param {Object} res - La réponse Express.
   */
  async getTotalUsers(req, res) {
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
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur lors de la récupération du nombre d\'utilisateurs'
      });
    }
  },

  /**
   * Récupère le nombre total de centres.
   * @param {Object} req - La requête Express.
   * @param {Object} res - La réponse Express.
   */
  async getTotalCenters(req, res) {
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
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur lors de la récupération du nombre de centres'
      });
    }
  },

  /**
   * Récupère le nombre total de substitutions.
   * @param {Object} req - La requête Express.
   * @param {Object} res - La réponse Express.
   */
  async getTotalSubstitutions(req, res) {
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
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur lors de la récupération du nombre de substitutions'
      });
    }
  }
};

export default statController;
