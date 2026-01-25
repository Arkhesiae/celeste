import mongoose from 'mongoose';

const AdminValueSchema = new mongoose.Schema({
  centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
  mode: {
    type: String,
    enum: ['static', 'dynamic'],
    default: 'static'
  },
  value: mongoose.Schema.Types.Mixed, // static number OR config object for dynamic
  updatedAt: { type: Date, default: Date.now },
});


const RuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  locked: { type: Boolean, default: false },
  defaultValue: {
    type: mongoose.Schema.Types.Mixed, // can store any type
    required: true,
  },
  adminValues: [AdminValueSchema],
}, {
  timestamps: true,
});


RuleSchema.methods.getPointsForCenter = function (centerId, itemId = null) {
  // Check if rule is locked
  if (this.locked) return this.defaultValue;

  const centerRule = this.adminValues.find(v => v.centerId.toString() === centerId.toString());

  if (!centerRule) return this.defaultValue; // no override for this center

  if (centerRule.mode === 'static') {
    return centerRule.value; // same value for all items
  }

  if (centerRule.mode === 'dynamic') {
    if (!itemId) {
      throw new Error('Item ID required for dynamic point calculation');
    }
    // Example dynamic logic: check collection mapping
    const collectionMapping = centerRule.value.collectionPoints || {};
    return collectionMapping[itemId] ?? this.defaultValue; // fallback to default
  }

  return this.defaultValue;
};


RuleSchema.methods.getValueForCenter = function (centerId) {
  if (this.locked) return this.defaultValue;
  const override = this.adminValues.find(v => v.centerId.toString() === centerId.toString());
  return override ? override.value : this.defaultValue;
};

const Rule = mongoose.model('Rule', RuleSchema);

export default Rule;

