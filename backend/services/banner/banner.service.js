import Banner from '../../models/Banner.js';
import { findOrThrow } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import { AppError } from '../../error/AppError.js';

/**
 * Build the MongoDB query filter for banners visible to a given user.
 * @param {string} userId
 * @param {string|null} centerId
 * @returns {Object} Mongoose filter
 */
const buildActiveFilter = (userId, centerId) => {
  const now = new Date();

  const scopeCondition = centerId
    ? { $or: [{ isGlobal: true }, { isGlobal: false, centerId: centerId }] }
    : { isGlobal: true };

  return {
    isActive: true,
    $and: [
      // Not expired
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      // Scope: global or center-specific
      scopeCondition
    ]
  };
};

/**
 * Retrieve all currently active banners for the requesting user.
 * - Permanent banners are always included.
 * - Non-permanent banners already acknowledged by the user are excluded.
 */
export const getActiveBanners = async (userId, centerId) => {
  const baseFilter = buildActiveFilter(userId, centerId);

  // Permanent banners — always show, regardless of acknowledgment
  const permanentBanners = await Banner.find({
    ...baseFilter,
    isPermanent: true
  })
    .sort({ createdAt: -1 })
    .lean();

  // Non-permanent, not yet acknowledged by this user
  const nonPermanentBanners = await Banner.find({
    ...baseFilter,
    isPermanent: false,
    'acknowledgedBy.userId': { $ne: userId }
  })
    .sort({ createdAt: -1 })
    .lean();

  return { permanentBanners, nonPermanentBanners };
};

/**
 * Mark an banner as acknowledged by the user.
 * Idempotent — will not add a duplicate entry.
 */
export const acknowledgeBanner = async (bannerId, userId) => {
  const banner = await findOrThrow(Banner, bannerId, { message: 'Bannière introuvable' });
  // Idempotent: only add if not already acknowledged
  const alreadyAcknowledged = banner.acknowledgedBy.some(
    a => sameId(a.userId, userId)
  );

  if (!alreadyAcknowledged) {
    banner.acknowledgedBy.push({ userId, acknowledgedAt: new Date() });
    await banner.save();
  }

  return banner;
};

/**
 * Retrieve all banners (admin).
 */
export const getAllBanners = async ({ page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', centerId = null } = {}) => {
  // Avec un centre : les bannières globales et celles de ce centre (sans : toutes, pour l'administrateur principal)
  const filter = centerId ? { $or: [{ isGlobal: true }, { centerId }] } : {};
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [banners, total] = await Promise.all([
    Banner.find(filter)
      .populate('createdBy', 'name lastName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Banner.countDocuments(filter)
  ]);

  return {
    banners,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Create a new public banner.
 */
export const createBanner = async (data, createdBy) => {
  const banner = new Banner({
    ...data,
    createdBy
  });
  await banner.save();
  return banner;
};

/**
 * Update an existing banner.
 */
export const updateBanner = async (id, data) => {
  const banner = await Banner.findByIdAndUpdate(
    id,
    { $set: data },
    { returnDocument: 'after', runValidators: true }
  );
  if (!banner) {
    throw new AppError('Bannière introuvable', 404);
  }
  return banner;
};

/**
 * Delete a public banner.
 */
export const deleteBanner = async (id) => {
  const banner = await Banner.findByIdAndDelete(id);
  if (!banner) {
    throw new AppError('Bannière introuvable', 404);
  }
  return banner;
};
