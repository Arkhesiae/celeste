const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'MIN_POINTS_TRANSFER',
      'MIN_POINTS_SWITCH',
      'MIN_REST_DAYS_7DAYS',
      'MAX_WORK_DAYS',
      'MIN_REST_BETWEEN_VACATIONS'
    ]
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Rule', ruleSchema); 