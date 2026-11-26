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

const bannerSchema = new mongoose.Schema({
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
  // `null` quand le compte de l'auteur a été supprimé : la bannière reste (et doit rester enregistrable, un « lu » la réenregistre)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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
  timestamps: true,
  // Les bannières s'appelaient « annonces publiques » : la collection garde son ancien nom pour ne pas migrer les données
  collection: 'publicannouncements'
});

// Indexes for common query patterns
bannerSchema.index({ isActive: 1, isGlobal: 1, createdAt: -1 });
bannerSchema.index({ isActive: 1, centerId: 1, createdAt: -1 });
bannerSchema.index({ isPermanent: 1 });
bannerSchema.index({ expiresAt: 1 });

/**
 * Returns true if this banner is currently visible (active and not expired).
 */
bannerSchema.methods.isCurrentlyVisible = function () {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
};

/**
 * Returns true if the given userId has acknowledged this announcement.
 */
bannerSchema.methods.isAcknowledgedBy = function (userId) {
  return this.acknowledgedBy.some(a => a.userId.toString() === userId.toString());
};

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;
