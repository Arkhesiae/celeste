import mongoose from 'mongoose';
import { dayField } from '../utils/dates/dayFields.js';

const centerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    OACI: { type: String, required: true, unique: true },
    zone: { type: String, required: false, enum: ['east', 'west', 'north', 'south', 'central'] },
    relatedCenters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Center' }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }],
    createdAt: { type: Date, default: Date.now },
    type: { type: String, required: true, enum: ['app', 'crna', 'other'] },
    timeZone: { type: String, required: true, default: "Europe/Paris" },
    // Date de référence du cycle (minuit UTC) : l'équipe d'offset 0 est au jour 1 de la rotation ce jour-là
    // TEMPORARY(day-fields): ancien champ Date, a supprimer avec la bascule (reste cycleAnchorDay).
    cycleAnchorDate: { type: Date },
    cycleAnchorDay: dayField,   // jumeau « jour » de cycleAnchorDate (migration en cours)
    deleted: { type: Boolean, default: false },
});

// Index pour faciliter la recherche des centres liés
centerSchema.index({ relatedCenters: 1 });

const Center = mongoose.model('Center', centerSchema);

export default Center;
