import mongoose from 'mongoose';

const ShiftSchema = new mongoose.Schema({
    name: {type: String, required: true},
    order: {type: Number, required: true},
    default : {
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
        points: {
            type: Number,
            required: true,
            min: [0, 'Les points par défaut doivent être positifs']
        },
        endsNextDay: {type: Boolean, default: false},
    },
    variations: [{type: mongoose.Schema.Types.ObjectId, ref: 'Variation'}],
    type: {
        type: String,
        enum: ['work', 'rest'],
        required: true
    },
    optional: {type: Boolean, default: false},
    deleted: {type: Boolean, default: false},
});

const Shift = mongoose.model('Shift', ShiftSchema);

export default Shift;

