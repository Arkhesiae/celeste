const mongoose = require('mongoose');

const centerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    OACI : { type: String, required: true },
    zones : { type: String, required: false},
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }], // Optional admin reference
    createdAt: { type: Date, default: Date.now },
    type: { type: String, required: true, enum: ['app', 'crna', 'other'] },
    timeZone: { type: String, required: true, default: "Europe/Paris" },
    deleted: { type: Boolean, default: false },
});

module.exports = mongoose.model('Center', centerSchema);
