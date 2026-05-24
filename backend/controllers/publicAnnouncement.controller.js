import * as announcementService from '../services/publicAnnouncementService.js';
import User from '../models/User.js';
import PublicAnnouncement from '../models/PublicAnnouncement.js';


export const getActiveAnnouncements = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('centerId').lean();
    const centerId = user?.centerId || null;

    const { permanentAnnouncements, nonPermanentAnnouncements } =
      await announcementService.getActiveAnnouncements(userId, centerId);

    res.json({
      success: true,
      permanentAnnouncements,
      nonPermanentAnnouncements
    });
  } catch (error) {
    next(error);
  }
};


export const acknowledgeAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await announcementService.acknowledgeAnnouncement(id, userId);

    res.json({ success: true, message: 'Annonce acquittée' });
  } catch (error) {
    next(error);
  }
};


export const getAllAnnouncements = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const result = await announcementService.getAllAnnouncements({
      page,
      limit,
      sortBy,
      sortOrder
    });

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /public-announcements
 * Admin — create a new public announcement.
 */
export const createAnnouncement = async (req, res, next) => {
  try {
    let { title, message, type, isPermanent, isActive, isGlobal, centerId, expiresAt } = req.body;

    if (!title || !message) {
      throw new AppError('Le titre et le message sont requis', 400);
    }

    const userId = req.user.userId;
    const user = await User.findById(userId).select('centerId adminType').lean();

    // Enforce local admin boundaries
    if (user?.adminType !== 'master') {
      isGlobal = false;
      centerId = user?.centerId || null;
    }

    if (!isGlobal && !centerId) {
      throw new AppError('Un centre est requis pour une annonce locale', 400);
    }

    const createdBy = req.user.userId;

    const announcement = await announcementService.createAnnouncement(
      { title, message, type, isPermanent, isActive, isGlobal, centerId, expiresAt },
      createdBy
    );

    res.status(201).json({ success: true, announcement });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /public-announcements/:id
 * Admin — update an existing announcement.
 */
export const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { title, message, type, isPermanent, isActive, isGlobal, centerId, expiresAt } = req.body;

    const userId = req.user.userId;
    const user = await User.findById(userId).select('centerId adminType').lean();
    const existing = await PublicAnnouncement.findById(id);

    if (!existing) {
      throw new AppError('Annonce non trouvée', 404);
    }

    // Enforce local admin boundaries
    if (user?.adminType !== 'master') {
      if (existing.isGlobal || existing.centerId !== user?.centerId) {
        throw new AppError('Accès refusé. Vous ne pouvez pas modifier cette annonce.', 403);
      }
      isGlobal = false;
      centerId = user?.centerId || null;
    }

    const announcement = await announcementService.updateAnnouncement(id, {
      title, message, type, isPermanent, isActive, isGlobal, centerId, expiresAt
    });

    res.json({ success: true, announcement });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /public-announcements/:id
 * Admin — permanently delete an announcement.
 */
export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;

    const userId = req.user.userId;
    const user = await User.findById(userId).select('centerId adminType').lean();
    const existing = await PublicAnnouncement.findById(id);

    if (!existing) {
      throw new AppError('Annonce non trouvée', 404);
    }

    // Enforce local admin boundaries
    if (user?.adminType !== 'master') {
      if (existing.isGlobal || existing.centerId !== user?.centerId) {
        throw new AppError('Accès refusé. Vous ne pouvez pas supprimer cette annonce.', 403);
      }
    }

    await announcementService.deleteAnnouncement(id);

    res.json({ success: true, message: 'Annonce supprimée' });
  } catch (error) {
    next(error);
  }
};
