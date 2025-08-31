import mongoose from 'mongoose';

const PlanningModificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    type: {
        type: String,
        enum: ['absence', 'custom', "selectedVariation"],
        required: true
    },

    isOff: {
        type: Boolean,
        default: false
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
 
    centerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Center',
        required: true
    },

    shift: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shift',
        default: null
    },

    selectedVariation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Variation',
        default: null
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
