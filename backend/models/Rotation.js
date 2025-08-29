import mongoose from 'mongoose';

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

    deleted: {type: Boolean, default: false},
 

}, {
    timestamps: true // Ajoute les champs createdAt et updatedAt
});

// Index composé pour optimiser les requêtes courantes
RotationSchema.index({ centerId: 1, active: 1, deleted: 1 });

const Rotation = mongoose.model('Rotation', RotationSchema);

export default Rotation;
