const mongoose = require('mongoose');

const TeamOccurrenceSchema = new mongoose.Schema({
    teamId : { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    fromDate : { type: Date, default: () => {
        const currentDate = new Date();
        currentDate.setUTCHours(0, 0, 0, 0); // Set the time to midnight UTC
        return currentDate;
    }},
    toDate : { type: Date, default: null}

});

// Schéma utilisateur
const userSchema = new mongoose.Schema({
    points: { 
        type: Number, 
        default: 0,
        min: -50000000000000000000000000
    },
    name: { 
        type: String, 
        required: [true, 'Le prénom est requis'],
        trim: true
    },
    lastName: { 
        type: String, 
        required: [true, 'Le nom est requis'],
        trim: true
    },
    teams : [TeamOccurrenceSchema],
    centerId : { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Center',
    },
    email: { 
        type: String, 
        required: [true, 'L\'email est requis'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Veuillez entrer un email valide']
    },
    password: { 
        type: String, 
        required: [true, 'Le mot de passe est requis']
    },
    avatar: {
        type: String,
        default: ''
    },
    isAdmin: { 
        type: Boolean, 
        default: false 
    },
    adminType: { 
        type: String,
        enum: ['master', 'local', null],
        default: null
    },
    registrationStatus: {
        type: String,
        enum: ['pending', 'verified'],
        default: 'pending'
    },
    preferences : {
        theme : { 
            type: Boolean, 
            default: false 
        },
        notifications : { 
            type: Boolean, 
            default: true 
        },
        emailNotifications : { 
            type: Boolean, 
            default: true 
        },
    },
    lastLogin: Date,
    isActive: {
        type: Boolean,
        default: true
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, {
    timestamps: true
});



// Crée un model depuis le schéma
const User = mongoose.model('User', userSchema);

// Exporter les models
module.exports = User