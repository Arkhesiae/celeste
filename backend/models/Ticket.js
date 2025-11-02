import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  shortId: {
    type: String,
    default: null
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['assistance', 'review', 'other'],
    required: true
  },
  senderEmail: {
    type: String,
    required: true,
    trim: true
  },
  adminType: {
    type: String,
    enum: ['master', 'local'],
    required: true
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    default: null
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['new', 'in_progress', 'done', 'closed'],
    default: 'new'
  },
  replySent: {
    type: Boolean,
    default: false
  },
  replies: [{
    content: {
      type: String,
      required: true
    },
    senderName: {
      type: String,
      default: ''
    },
    isFromAdmin: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  deleted: {
    type: Boolean,
    default: false
  },
  archived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances des requêtes
ticketSchema.index({ adminType: 1, createdAt: -1 });
ticketSchema.index({ isRead: 1 });
ticketSchema.index({ archived: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket; 