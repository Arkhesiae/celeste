import mongoose from 'mongoose';

const ruleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ['Number', 'Boolean'],
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,

  },
  description: {
    type: String,
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});



const Rule = mongoose.model('Rule', ruleSchema);

export default Rule; 