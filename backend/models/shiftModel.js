const mongoose = require('mongoose');
   
const ShiftSchema = new mongoose.Schema({
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

module.exports = mongoose.model('Shift', ShiftSchema); 