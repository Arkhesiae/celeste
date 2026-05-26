import { AppError } from '../error/appError.js';
import * as announcementService from '../services/publicAnnouncementService.js';


export const getActiveAnnouncements = async (req, res, next) => {
  try {
    const { userId, centerId } = req.user;

    const { permanentAnnouncements, nonPermanentAnnouncements } =
      await announcementService.getActiveAnnouncements(userId, centerId ?? null);

    res.json({ success: true, permanentAnnouncements, nonPermanentAnnouncements });
  } catch (err) {
    next(err);
  }
};

export const acknowledgeAnnouncement = async (req, res, next) => {
  try {
    await announcementService.acknowledgeAnnouncement(req.params.id, req.user.userId);
    res.json({ success: true, message: 'Annonce acquittée' });
  } catch (err) {
    next(err);
  }
};

export const getAllAnnouncements = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const result = await announcementService.getAllAnnouncements({ page, limit, sortBy, sortOrder });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    let { title, message, type, isPermanent, isActive, isGlobal, centerId, expiresAt } = req.body;

    if (!title || !message) throw new AppError('Le titre et le message sont requis', 400);

    if (req.user.adminType !== 'master') {
      isGlobal = false;
      centerId = req.user.centerId ?? null;
    }

    if (!isGlobal && !centerId) {
      throw new AppError('Un centre est requis pour une annonce locale', 400);
    }

    const announcement = await announcementService.createAnnouncement(
      { title, message, type, isPermanent, isActive, isGlobal, centerId, expiresAt },
      req.user.userId
    );

    res.status(201).json({ success: true, announcement });
  } catch (err) {
    next(err);
  }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    let { title, message, type, isPermanent, isActive, isGlobal, centerId, expiresAt } = req.body;

    if (req.user.adminType !== 'master') {
      isGlobal = false;
      centerId = req.user.centerId ?? null;
    }

    const announcement = await announcementService.updateAnnouncement(req.params.id, {
      title, message, type, isPermanent, isActive, isGlobal, centerId, expiresAt,
    });

    res.json({ success: true, announcement });
  } catch (err) {
    next(err);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    await announcementService.deleteAnnouncement(req.params.id);
    res.json({ success: true, message: 'Annonce supprimée' });
  } catch (err) {
    next(err);
  }
};