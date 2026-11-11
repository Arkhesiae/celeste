import mongoose from 'mongoose';
import { dayField } from '../utils/dates/dayFields.js';

const RotationSchema = new mongoose.Schema({
    name: {type: String, required: true},
    centerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Center',
        required: true,
        index: true
    },
    
    days: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shift' }],
    activationDates: {
        type: [Date],
    },
    // Jumeau « jour » de activationDates (YYYY-MM-DD, même ordre), migration en cours : voir utils/dates/dayFields.js
    activationDays: {
        type: [dayField],
    },

    deleted: {type: Boolean, default: false},
 

}, {
    timestamps: true // Ajoute les champs createdAt et updatedAt
});

// Index composé pour optimiser les requêtes courantes
RotationSchema.index({ centerId: 1, active: 1, deleted: 1 });

const Rotation = mongoose.model('Rotation', RotationSchema);

export default Rotation;
