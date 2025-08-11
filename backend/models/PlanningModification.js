import mongoose from 'mongoose';

const PlanningModificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['absence', 'off_day', 'custom_modification'],
        required: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    startTime: {
        type: String,
        validate: {
            validator: function(v) {
                if (!v) return true; // Optionnel
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: props => `${props.value} n'est pas un format d'heure valide (HH:MM)`
        }
    },
    endTime: {
        type: String,
        validate: {
            validator: function(v) {
                if (!v) return true; // Optionnel
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: props => `${props.value} n'est pas un format d'heure valide (HH:MM)`
        }
    },
    comment: {
        type: String,
        default: '',
        maxlength: [500, 'Le commentaire ne peut pas dépasser 500 caractères']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    },
    centerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Center',
        required: true
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        default: null
    },
    // Pour les modifications personnalisées futures
    modificationData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Indique si la modification a été prise en compte dans le calcul des shifts
    isApplied: {
        type: Boolean,
        default: false
    },
    // Date de création et de modification
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index pour optimiser les requêtes fréquentes
PlanningModificationSchema.index({ userId: 1, date: 1 });
PlanningModificationSchema.index({ centerId: 1, date: 1 });
PlanningModificationSchema.index({ status: 1 });
PlanningModificationSchema.index({ type: 1 });

// Méthode pour vérifier les conflits avec les substitutions
PlanningModificationSchema.methods.checkSubstitutionConflicts = async function() {
    const Substitution = mongoose.model('Substitution');
    
    // Vérifier si l'utilisateur a des demandes de substitution pour cette date
    const substitutionDemands = await Substitution.find({
        $and: [
            {
                $or: [
                    { posterId: this.userId },
                    { accepterId: this.userId }
                ]
            },
            {
                $or: [
                    { 'posterShift.date': this.date },
                    { 'accepterShift.date': this.date }
                ]
            },
            { status: { $in: ['open', 'accepted'] } },
            { deleted: false }
        ]
    });

    return substitutionDemands.length > 0;
};

// Méthode statique pour obtenir les modifications d'un utilisateur pour une période
PlanningModificationSchema.statics.getUserModificationsForPeriod = async function(userId, startDate, endDate) {
    return await this.find({
        userId: userId,
        date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        },
        status: { $in: ['pending', 'approved'] }
    }).sort({ date: 1 });
};

// Méthode statique pour obtenir toutes les modifications d'un centre pour une période
PlanningModificationSchema.statics.getCenterModificationsForPeriod = async function(centerId, startDate, endDate) {
    return await this.find({
        centerId: centerId,
        date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        },
        status: { $in: ['pending', 'approved'] }
    }).populate('userId', 'name lastName email').sort({ date: 1 });
};

const PlanningModification = mongoose.model('PlanningModification', PlanningModificationSchema);

export default PlanningModification;
