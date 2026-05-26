import mongoose from 'mongoose';

const acknowledgedBySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  acknowledgedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const publicAnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'maintenance', 'update'],
    default: 'info'
  },
  isPermanent: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isGlobal: {
    type: Boolean,
    default: true
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  acknowledgedBy: {
    type: [acknowledgedBySchema],
    default: []
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for common query patterns
publicAnnouncementSchema.index({ isActive: 1, isGlobal: 1, createdAt: -1 });
publicAnnouncementSchema.index({ isActive: 1, centerId: 1, createdAt: -1 });
publicAnnouncementSchema.index({ isPermanent: 1 });
publicAnnouncementSchema.index({ expiresAt: 1 });

/**
 * Returns true if this announcement is currently visible (active and not expired).
 */
publicAnnouncementSchema.methods.isCurrentlyVisible = function () {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
};

/**
 * Returns true if the given userId has acknowledged this announcement.
 */
publicAnnouncementSchema.methods.isAcknowledgedBy = function (userId) {
  return this.acknowledgedBy.some(a => a.userId.toString() === userId.toString());
};

const PublicAnnouncement = mongoose.model('PublicAnnouncement', publicAnnouncementSchema);

export default PublicAnnouncement;
