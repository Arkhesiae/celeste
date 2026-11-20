import { AppError } from '../error/AppError.js';
import * as bannerService from '../services/banner/index.js';

export const getActiveBanners = async (req, res, next) => {
  try {
    const { userId, centerId } = req.user;

    const { permanentBanners, nonPermanentBanners } =
      await bannerService.getActiveBanners(userId, centerId ?? null);

    res.json({ success: true, permanentBanners, nonPermanentBanners });
  } catch (err) {
    next(err);
  }
};

export const acknowledgeBanner = async (req, res, next) => {
  try {
    await bannerService.acknowledgeBanner(req.params.id, req.user.userId);
    res.json({ success: true, message: 'Bannière acquittée' });
  } catch (err) {
    next(err);
  }
};

export const getAllBanners = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Un administrateur local ne voit que les bannières globales et celles de son centre
    const centerId = req.user.adminType === 'master' ? null : (req.user.centerId ?? null);

    const result = await bannerService.getAllBanners({ page, limit, sortBy, sortOrder, centerId });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const createBanner = async (req, res, next) => {
  try {
    let { title, message, type, isPermanent, isActive, isGlobal, centerId, expiresAt } = req.body;

    if (!title || !message) throw new AppError('Le titre et le message sont requis', 400);

    if (req.user.adminType !== 'master') {
      isGlobal = false;
      centerId = req.user.centerId ?? null;
    }

    if (!isGlobal && !centerId) {
      throw new AppError('Un centre est requis pour une bannière locale', 400);
    }

    const banner = await bannerService.createBanner(
      { title, message, type, isPermanent, isActive, isGlobal, centerId, expiresAt },
      req.user.userId
    );

    res.status(201).json({ success: true, banner });
  } catch (err) {
    next(err);
  }
};

export const updateBanner = async (req, res, next) => {
  try {
    let { title, message, type, isPermanent, isActive, isGlobal, centerId, expiresAt } = req.body;

    if (req.user.adminType !== 'master') {
      isGlobal = false;
      centerId = req.user.centerId ?? null;
    }

    const banner = await bannerService.updateBanner(req.params.id, {
      title, message, type, isPermanent, isActive, isGlobal, centerId, expiresAt,
    });

    res.json({ success: true, banner });
  } catch (err) {
    next(err);
  }
};

export const deleteBanner = async (req, res, next) => {
  try {
    await bannerService.deleteBanner(req.params.id);
    res.json({ success: true, message: 'Bannière supprimée' });
  } catch (err) {
    next(err);
  }
};