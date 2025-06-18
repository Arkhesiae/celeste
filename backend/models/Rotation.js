import mongoose from 'mongoose';

const DaySchema = new mongoose.Schema({
    name: {type: String, required: true},
    startTime: {
        type: String,
        validate: {
            validator: function(v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: props => `${props.value} n'est pas un format d'heure valide (HH:MM)`
        }
    },
    endTime: {
        type: String,
        validate: {
            validator: function(v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: props => `${props.value} n'est pas un format d'heure valide (HH:MM)`
        }
    },
    variants: [{
        name: {type: String, required: true},
        startTime: {
            type: String,
            validate: {
                validator: function(v) {
                    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                },
                message: props => `${props.value} n'est pas un format d'heure valide (HH:MM)`
            }
        },
        endTime: {
            type: String,
            validate: {
                validator: function(v) {
                    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                },
                message: props => `${props.value} n'est pas un format d'heure valide (HH:MM)`
            }
        },
        defaultPoints: {
            type: Number,
            required: true,
            min: [0, 'Les points par défaut doivent être positifs']
        },
    }],
    endsNextDay: {type: Boolean, default: false},
    defaultPoints: {
        type: Number,
        required: true,
        min: [0, 'Les points par défaut doivent être positifs']
    },
    type: {
        type: String,
        enum: ['work', 'rest'],
        required: true
    },
});

const RotationSchema = new mongoose.Schema({
    name: {type: String, required: true},
    days: [DaySchema],
    centerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Center',
        required: true,
        index: true
    },
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
