import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Le montant doit être positif']
    },
    type: {
        type: String,
        enum: ['transfer', 'replacement', 'swap'],
        required: true
    },
    request: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Substitution',
        default: null
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending'
    },
    effectiveDate: {
        type: Date,
      
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index pour optimiser les requêtes
TransactionSchema.index({ sender: 1, receiver: 1 });
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ effectiveDate: 1, status: 1 });

const Transaction = mongoose.model('Transaction', TransactionSchema);

export default Transaction; 