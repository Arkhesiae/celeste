const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
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
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances des requêtes
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, createdAt: -1 });
messageSchema.index({ isRead: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 