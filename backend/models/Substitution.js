import mongoose from 'mongoose';

const NewShiftSchema = new mongoose.Schema({
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    date: { type: Date, required: false },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    selectedVariation: { type: mongoose.Schema.Types.ObjectId, ref: 'Variation', default: null },
});

const SubstitutionSchema = new mongoose.Schema({
    posterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    accepterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    posterShift: {
        type: NewShiftSchema,
        required: true
    },
    accepterShift: {
        type: NewShiftSchema,
        default: null
    },
    centerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Center',
        required: true,
    },
    rotation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rotation'
    },
    acceptedSwitches: [
        {
            shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
            points: {
                type: Number,
                default: 0,
                min: [0, 'Les points doivent être positifs']
            }
        }],
    isTrueSwitch: { type: Boolean, default: false },
    type: { type: String, enum: ['switch', 'hybrid', 'substitution'] },
    comment: {
        type: String,
        default: ''
    },
    points: {
        type: Number,
        required: true,
        min: [0, 'Les points doivent être positifs']
    },
    status: {
        type: String,
        enum: ['open', 'accepted', 'completed', 'cancelled', 'expired', 'system-cancelled'],
        default: 'open'
    },
    deleted: {
        type: Boolean,
        default: false,
        index: true
    },
    reservedForUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    seenBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    consultedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    interested: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    dependsOn: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Substitution'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Ajout des index pour optimiser les requêtes fréquentes
SubstitutionSchema.index({ status: 1 });
SubstitutionSchema.index({ centerId: 1 });

const Substitution = mongoose.model('Substitution', SubstitutionSchema);

export default Substitution;
