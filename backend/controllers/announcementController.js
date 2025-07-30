import { sendBulkAnnouncementEmail, getAvailableTemplates, EMAIL_TEMPLATES } from '../services/email/announcementEmail.js';
import User from '../models/User.js';
import Announcement from '../models/Announcement.js';

/**
 * Récupère la liste des templates disponibles
 */
const getTemplates = async (req, res) => {
  try {
    const templates = getAvailableTemplates();
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Erreur lors de la récupération des templates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des templates' 
    });
  }
};

/**
 * Génère un aperçu HTML d'un template avec les données fournies
 */
const getTemplatePreview = async (req, res) => {
  try {
    const { templateType } = req.params;
    const data = req.body;

    // Vérifier que le template existe
    if (!EMAIL_TEMPLATES[templateType]) {
      return res.status(400).json({
        success: false,
        message: `Template '${templateType}' non trouvé`
      });
    }

    // Générer l'aperçu HTML
    const template = EMAIL_TEMPLATES[templateType];
    const html = template.html(data);

    res.json({ 
      success: true, 
      html,
      templateType 
    });
  } catch (error) {
    console.error('Erreur lors de la génération de l\'aperçu:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la génération de l\'aperçu' 
    });
  }
};

/**
 * Récupère le nombre total d'utilisateurs pour l'envoi en masse
 */
const getUserCount = async (req, res) => {
  try {
    const userCount = await User.countDocuments({ 
      email: { $exists: true, $ne: '' },
      isActive: true 
    });
    res.json({ success: true, count: userCount });
  } catch (error) {
    console.error('Erreur lors du comptage des utilisateurs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du comptage des utilisateurs' 
    });
  }
};

/**
 * Envoie un email d'annonce en masse
 */
const sendAnnouncement = async (req, res) => {
  try {
    const { templateType, message, duration, testMode = false } = req.body;

    // Validation des données
    if (!templateType || !message) {
      return res.status(400).json({
        success: false,
        message: 'Le type de template et le message sont requis'
      });
    }

    // Récupération des emails des utilisateurs
    let userEmails;
    if (testMode) {
      // Mode test : envoi à l'admin uniquement
      userEmails = ["nicolas.m.gardet@gmail.com"];
    } else {
      // Envoi à tous les utilisateurs actifs
      const users = await User.find({ 
        email: { $exists: true, $ne: '' },
        isActive: true 
      }).select('email');
      userEmails = users.map(user => user.email);
    }

    if (userEmails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun utilisateur trouvé pour l\'envoi'
      });
    }

    // Préparation des données pour le template
    const templateData = {
      message,
      ...(duration && { duration })
    };

    // Envoi des emails
    const results = await sendBulkAnnouncementEmail(userEmails, templateType, templateData);

    // Sauvegarde de l'annonce en base
    const announcement = new Announcement({
      templateType,
      message,
      duration,
      sentAt: new Date(),
      results: {
        total: results.total,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors
      },
      testMode
    });

    await announcement.save();

    // Log de l'action
    console.log(`📧 Annonce envoyée par ${req.user.email}:`, {
      templateType,
      totalRecipients: results.total,
      sent: results.sent,
      failed: results.failed,
      testMode
    });

    res.json({
      success: true,
      message: testMode 
        ? 'Email de test envoyé avec succès' 
        : `Annonce envoyée à ${results.sent} utilisateurs`,
      results
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'annonce:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de l\'annonce',
      error: error.message
    });
  }
};

/**
 * Récupère l'historique des annonces envoyées
 */
const getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'sentAt', sortOrder = 'desc' } = req.query;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [announcements, total] = await Promise.all([
      Announcement.find()
        .populate('sentBy', 'name lastName email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Announcement.countDocuments()
    ]);

    res.json({
      success: true,
      history: announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique'
    });
  }
};

/**
 * Récupère les statistiques des annonces
 */
const getStats = async (req, res) => {
  try {
    const stats = await Announcement.aggregate([
      {
        $group: {
          _id: null,
          totalAnnouncements: { $sum: 1 },
          totalEmailsSent: { $sum: '$results.sent' },
          totalEmailsFailed: { $sum: '$results.failed' },
          avgEmailsSent: { $avg: '$results.sent' }
        }
      }
    ]);

    const templateStats = await Announcement.aggregate([
      {
        $group: {
          _id: '$templateType',
          count: { $sum: 1 },
          totalSent: { $sum: '$results.sent' },
          totalFailed: { $sum: '$results.failed' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const recentActivity = await Announcement.find()
      .populate('sentBy', 'name lastName')
      .sort({ sentAt: -1 })
      .limit(5)
      .select('templateType message sentAt results testMode sentBy')
      .lean();

    res.json({
      success: true,
      stats: stats[0] || {
        totalAnnouncements: 0,
        totalEmailsSent: 0,
        totalEmailsFailed: 0,
        avgEmailsSent: 0
      },
      templateStats,
      recentActivity
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

/**
 * Supprime une annonce de l'historique
 */
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée'
      });
    }

    // Vérifier que l'utilisateur peut supprimer cette annonce
    if (announcement.sentBy.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à supprimer cette annonce'
      });
    }

    await Announcement.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Annonce supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'annonce:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'annonce'
    });
  }
};

export {
  getTemplates,
  getTemplatePreview,
  getUserCount,
  sendAnnouncement,
  getHistory,
  getStats,
  deleteAnnouncement
}; 