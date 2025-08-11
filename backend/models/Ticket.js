import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
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
  deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances des requêtes
ticketSchema.index({ adminType: 1, createdAt: -1 });
ticketSchema.index({ isRead: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket; 