import mongoose from 'mongoose';
import { dayField } from '../utils/dates/dayFields.js';

const TeamOccurrenceSchema = new mongoose.Schema({
    teamId : { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    // TEMPORARY(day-fields): ancien champ Date (idem toDate ci-dessous) : a supprimer avec la bascule (restent fromDay / toDay).
    fromDate : { type: Date, default: () => {
        const currentDate = new Date();
        currentDate.setUTCHours(0, 0, 0, 0); // Set the time to midnight UTC
        return currentDate;
    }},
    toDate : { type: Date, default: null},
    // Jumeaux « jour » (YYYY-MM-DD) de fromDate / toDate : migration en cours, voir utils/dates/dayFields.js
    fromDay : dayField,
    toDay : { ...dayField, default: null }

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
        emails: {
            all: { type: Boolean, default: true }, // false = fully unsubscribed
            categories: {
                type: Object,
                default: {
                    announcements: true,
                    switch: true,
                    replacement: true,
                },
            }
        }
    },        
    personalData : {
        phoneNumber : { type: String, default: '' },
        // TEMPORARY(day-fields): ancien champ Date, a supprimer avec la bascule (reste birthDay).
        birthDate : { type: Date, default: null },
        birthDay : dayField,   // jumeau « jour » de birthDate (migration en cours)
    },
    lastLogin: Date,
    isActive: {
        type: Boolean,
        default: true
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    refreshTokens: [{
        token: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: Date
    }]
}, {
    timestamps: true
});

// Jamais sérialisés vers un client (res.json(user), user.toObject()...) : hash du mot de passe, jetons de session
// et de réinitialisation. Ils restent lisibles sur le document (user.password, user.refreshTokens...) pour les flux
// d'authentification, qui ne passent pas par la sérialisation.
const SENSITIVE_FIELDS = ['password', 'refreshTokens', 'resetPasswordToken', 'resetPasswordExpires'];
const stripSensitiveFields = (doc, ret) => {
    for (const field of SENSITIVE_FIELDS) delete ret[field];
    return ret;
};
userSchema.set('toObject', { transform: stripSensitiveFields });
userSchema.set('toJSON', { transform: stripSensitiveFields });

const legacyUserSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    ID: { type: Number, required: true },
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    login: { type: String, required: true },
    pass: { type: String, required: true },
    email: { type: String, required: true },
    tel: { type: String },
    mailing: { type: Number },
    rappel: { type: Number },
    centre: { type: String, required: true },
    equipe: { type: Number },
    compte: { type: Number },
    recovered: { type: Boolean, default: false },
}, {
    timestamps: true
});

// Crée un model depuis le schéma
const User = mongoose.model('User', userSchema);
const LegacyUser = mongoose.model('LegacyUser', legacyUserSchema, 'legacyUsers');

// Exporter les models
export default User;
export { LegacyUser, User };