import PublicAnnouncement from '../models/PublicAnnouncement.js';

/**
 * Build the MongoDB query filter for announcements visible to a given user.
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
 * Retrieve all currently active announcements for the requesting user.
 * - Permanent announcements are always included.
 * - Non-permanent announcements already acknowledged by the user are excluded.
 */
export const getActiveAnnouncements = async (userId, centerId) => {
  const baseFilter = buildActiveFilter(userId, centerId);

  // Permanent announcements — always show, regardless of acknowledgment
  const permanentAnnouncements = await PublicAnnouncement.find({
    ...baseFilter,
    isPermanent: true
  })
    .sort({ createdAt: -1 })
    .lean();

  // Non-permanent, not yet acknowledged by this user
  const nonPermanentAnnouncements = await PublicAnnouncement.find({
    ...baseFilter,
    isPermanent: false,
    'acknowledgedBy.userId': { $ne: userId }
  })
    .sort({ createdAt: -1 })
    .lean();

  return { permanentAnnouncements, nonPermanentAnnouncements };
};

/**
 * Mark an announcement as acknowledged by the user.
 * Idempotent — will not add a duplicate entry.
 */
export const acknowledgeAnnouncement = async (announcementId, userId) => {
  const announcement = await PublicAnnouncement.findById(announcementId);
  if (!announcement) {
    throw new Error('Announcement not found');
  }

  // Idempotent: only add if not already acknowledged
  const alreadyAcknowledged = announcement.acknowledgedBy.some(
    a => a.userId.toString() === userId.toString()
  );

  if (!alreadyAcknowledged) {
    announcement.acknowledgedBy.push({ userId, acknowledgedAt: new Date() });
    await announcement.save();
  }

  return announcement;
};

/**
 * Retrieve all announcements (admin).
 */
export const getAllAnnouncements = async ({ page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = {}) => {
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [announcements, total] = await Promise.all([
    PublicAnnouncement.find()
      .populate('createdBy', 'name lastName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    PublicAnnouncement.countDocuments()
  ]);

  return {
    announcements,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Create a new public announcement.
 */
export const createAnnouncement = async (data, createdBy) => {
  const announcement = new PublicAnnouncement({
    ...data,
    createdBy
  });
  await announcement.save();
  return announcement;
};

/**
 * Update an existing announcement.
 */
export const updateAnnouncement = async (id, data) => {
  const announcement = await PublicAnnouncement.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!announcement) {
    throw new Error('Announcement not found');
  }
  return announcement;
};

/**
 * Delete a public announcement.
 */
export const deleteAnnouncement = async (id) => {
  const announcement = await PublicAnnouncement.findByIdAndDelete(id);
  if (!announcement) {
    throw new Error('Announcement not found');
  }
  return announcement;
};
