import mongoose from 'mongoose';

const PlanningModificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    centerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Center',
        required: true
    },

    type: {
        type: String,
        enum: ['absence', 'custom', "shiftVariation", "office", "stage", "customShift", "restoration", "substitution"],
        required: true
    },

    isOff: {
        type: Boolean,
        default: false
    },

    substitutionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Substitution',
        default: null
    },
    
    date: {
        type: Date,
        required: true,
        index: true
    },

    comment: {
        type: String,
        default: '',
        maxlength: [500, 'Le commentaire ne peut pas dépasser 500 caractères']
    },

    shiftData: {
        shift: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shift',
            default: null
        },
        selectedVariation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Variation',
            default: null
        }
    },

    startTime: {
        type: String,
        validate: {
            validator: function(v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v) || v === null;
            },
            message: props => `${props.value} n'est pas un format d'heure valide (HH:MM)`
        }
    },
    endTime: {
        type: String,
        validate: {
            validator: function(v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v) || v === null;
            },
            message: props => `${props.value} n'est pas un format d'heure valide (HH:MM)`
        }
    },

    // Date de création et de modification
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


const PlanningModification = mongoose.model('PlanningModification', PlanningModificationSchema);

export default PlanningModification;
