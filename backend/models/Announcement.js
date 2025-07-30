import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  templateType: {
    type: String,
    required: true,
    enum: ['maintenance', 'update', 'general']
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: String,
    trim: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  results: {
    total: {
      type: Number,
      required: true
    },
    sent: {
      type: Number,
      required: true
    },
    failed: {
      type: Number,
      required: true
    },
    errors: [{
      email: String,
      error: String
    }]
  },
  testMode: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances des requêtes
announcementSchema.index({ sentAt: -1 });
announcementSchema.index({ templateType: 1 });
announcementSchema.index({ testMode: 1 });

// Méthodes statiques
announcementSchema.statics.getStats = function() {
  return this.aggregate([
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
};

announcementSchema.statics.getTemplateStats = function() {
  return this.aggregate([
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
};

announcementSchema.statics.getRecentActivity = function(limit = 5) {
  return this.find()
      .sort({ sentAt: -1 })
    .limit(limit)
    .select('templateType message sentAt results testMode')
    .lean();
};

// Méthodes d'instance
announcementSchema.methods.getSuccessRate = function() {
  if (this.results.total === 0) return 0;
  return Math.round((this.results.sent / this.results.total) * 100);
};

announcementSchema.methods.getFormattedSentAt = function() {
  return this.sentAt.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Virtuals
announcementSchema.virtual('successRate').get(function() {
  return this.getSuccessRate();
});

announcementSchema.virtual('formattedSentAt').get(function() {
  return this.getFormattedSentAt();
});

// Configuration pour inclure les virtuals dans les réponses JSON
announcementSchema.set('toJSON', { virtuals: true });
announcementSchema.set('toObject', { virtuals: true });

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement; 