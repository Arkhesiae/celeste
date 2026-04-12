import { sendBulkAnnouncementEmail } from '../services/email/announcementEmail.js';
import User from '../models/User.js';
import Announcement from '../models/Announcement.js';
import Center from '../models/Center.js';

// /**
//  * Récupère la liste des templates disponibles
//  */

// const getTemplates = async (req, res) => {
//   try {
//     const templates = getAvailableTemplates();
//     res.json({ success: true, templates });
//   } catch (error) {
//     console.error('Erreur lors de la récupération des templates:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Erreur lors de la récupération des templates'
//     });
//   }
// };

// /**
//  * Génère un aperçu HTML d'un template avec les données fournies
//  */
// const getTemplatePreview = async (req, res) => {
//   try {
//     const { templateType } = req.params;
//     const data = req.body;


//     // Vérifier que le template existe
//     if (!EMAIL_TEMPLATES[templateType]) {
//       return res.status(400).json({
//         success: false,
//         message: `Template '${templateType}' non trouvé`
//       });
//     }

//     // Générer l'aperçu HTML
//     const template = EMAIL_TEMPLATES[templateType];
//     const html = template.html(data);

//     res.json({ 
//       success: true, 
//       html,
//       templateType 
//     });
//   } catch (error) {
//     console.error('Erreur lors de la génération de l\'aperçu:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Erreur lors de la génération de l\'aperçu' 
//     });
//   }
// };

/**
 * Récupère le nombre total d'utilisateurs pour l'envoi en masse
 */
const getUserCount = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (user.adminType === 'master') {
      const userCount = await User.countDocuments();
      res.json({ success: true, count: userCount });
    } else {
      const userCount = await User.countDocuments({ centerId: user.centerId });
      res.json({ success: true, count: userCount });
    }
  } catch (error) {
    next(error);
  }
};

const getMailList = async (testMode, isGlobal, centerId) => {
  try {
    let userEmails;
    if (testMode) {
      return ["nicolas.m.gardet@gmail.com", "cress1@atcat.fr"];
    }

    if (isGlobal) {
      const users = await User.find({
        email: { $exists: true, $ne: '' },
        'preferences.emails.all': { $ne: false },
        'preferences.emails.categories.announcements': { $ne: false },
        isActive: true
      }).select('email');
      return users.map(user => user.email);
    }

    if (centerId) {
      const users = await User.find({
        centerId: centerId,
        email: { $exists: true, $ne: '' },
        'preferences.emails.all': { $ne: false },
        'preferences.emails.categories.announcements': { $ne: false },
        isActive: true
      }).select('email');
      return users.map(user => user.email);
    }

  } catch (error) {
    next(error);
  }
};
/**
 * Envoie un email d'annonce en masse
 */
const sendAnnouncement = async (req, res) => {
  try {
    const { title, message, isGlobal, centerId, testMode = false } = req.body;

    // Validation des données
    if (!title || !message) {
      throw new AppError('Le titre et le message sont requis', 400);
    }

    const userEmails = await getMailList(testMode, isGlobal, centerId);

    if (userEmails.length === 0) {
      throw new AppError('Aucun utilisateur trouvé pour l\'envoi', 404);
    }

    const center = await Center.findById(centerId);

    // Préparation des données pour le template
    const templateData = {
      title,
      message,
      isGlobal,
      centerName: center?.name,
    };

    // Envoi des emails
    const results = await sendBulkAnnouncementEmail(userEmails, templateData);

    // Sauvegarde de l'annonce en base
    const announcement = new Announcement({
      title,
      isGlobal,
      centerId,
      message,
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
      title,
      isGlobal,
      centerId,
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
    next(error);
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
    next(error);
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
      .sort({ sentAt: -1 })
      .limit(5)
      .select('templateType message sentAt results testMode')
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
    next(error);
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
      throw new AppError('Annonce non trouvée', 404);
    }

    // Vérifier que l'utilisateur peut supprimer cette annonce
    if (announcement.sentBy.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      throw new AppError('Vous n\'êtes pas autorisé à supprimer cette annonce', 403);
    }

    await Announcement.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Annonce supprimée avec succès'
    });
  } catch (error) {
    next(error);
  }
};

export {
  // getTemplates,
  // getTemplatePreview,
  getUserCount,
  sendAnnouncement,
  getHistory,
  getStats,
  deleteAnnouncement
}; 