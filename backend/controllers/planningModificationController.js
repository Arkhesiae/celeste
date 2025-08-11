import PlanningModification from '../models/PlanningModification.js';
import User from '../models/User.js';
import Substitution from '../models/Substitution.js';
import { computeShiftOfUserWithSubstitutions } from '../utils/computeShiftOfUserWithSubstitutions.js';

// Créer une nouvelle modification de planning
const createModification = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type, date, startTime, endTime, comment, centerId, teamId } = req.body;

        // Validation des données requises
        if (!type || !date || !centerId) {
            return res.status(400).json({ 
                error: 'Les champs type, date et centerId sont requis' 
            });
        }

        // Vérifier que l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérifier que la date n'est pas dans le passé
        const modificationDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (modificationDate < today) {
            return res.status(400).json({ 
                error: 'Impossible de créer une modification pour une date passée' 
            });
        }

        // Vérifier les conflits avec les substitutions
        const tempModification = new PlanningModification({
            userId,
            type,
            date: modificationDate,
            startTime,
            endTime,
            comment,
            centerId,
            teamId
        });

        const hasConflicts = await tempModification.checkSubstitutionConflicts();
        if (hasConflicts) {
            return res.status(400).json({ 
                error: 'Impossible de créer cette modification car vous avez des demandes de substitution ou êtes impliqué dans une substitution pour cette date' 
            });
        }

        // Vérifier s'il existe déjà une modification pour cette date
        const existingModification = await PlanningModification.findOne({
            userId,
            date: modificationDate,
            status: { $in: ['pending', 'approved'] }
        });

        if (existingModification) {
            return res.status(400).json({ 
                error: 'Une modification existe déjà pour cette date' 
            });
        }

        // Créer la modification
        const modification = new PlanningModification({
            userId,
            type,
            date: modificationDate,
            startTime,
            endTime,
            comment,
            centerId,
            teamId
        });

        await modification.save();

        // Populate les références pour la réponse
        await modification.populate('userId', 'name lastName email');
        await modification.populate('centerId', 'name');

        res.status(201).json({
            message: 'Modification de planning créée avec succès',
            modification
        });

    } catch (error) {
        console.error('Erreur lors de la création de la modification:', error);
        res.status(500).json({ 
            error: 'Une erreur est survenue lors de la création de la modification' 
        });
    }
};

// Obtenir les modifications d'un utilisateur
const getUserModifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { startDate, endDate, status } = req.query;

        let query = { userId };

        // Filtrer par période si fournie
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Filtrer par statut si fourni
        if (status) {
            query.status = status;
        }

        const modifications = await PlanningModification.find(query)
            .populate('userId', 'name lastName email')
            .populate('centerId', 'name')
            .populate('teamId', 'name')
            .populate('approvedBy', 'name lastName')
            .sort({ date: 1, createdAt: -1 });

        res.json(modifications);

    } catch (error) {
        console.error('Erreur lors de la récupération des modifications:', error);
        res.status(500).json({ 
            error: 'Une erreur est survenue lors de la récupération des modifications' 
        });
    }
};

// Obtenir toutes les modifications d'un centre (pour les admins)
const getCenterModifications = async (req, res) => {
    try {
        const { centerId } = req.params;
        const { startDate, endDate, status, type } = req.query;

        let query = { centerId };

        // Filtrer par période si fournie
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Filtrer par statut si fourni
        if (status) {
            query.status = status;
        }

        // Filtrer par type si fourni
        if (type) {
            query.type = type;
        }

        const modifications = await PlanningModification.find(query)
            .populate('userId', 'name lastName email')
            .populate('centerId', 'name')
            .populate('teamId', 'name')
            .populate('approvedBy', 'name lastName')
            .sort({ date: 1, createdAt: -1 });

        res.json(modifications);

    } catch (error) {
        console.error('Erreur lors de la récupération des modifications du centre:', error);
        res.status(500).json({ 
            error: 'Une erreur est survenue lors de la récupération des modifications' 
        });
    }
};

// Approuver ou rejeter une modification (pour les admins)
const updateModificationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comment } = req.body;
        const adminId = req.user.userId;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ 
                error: 'Le statut doit être "approved" ou "rejected"' 
            });
        }

        const modification = await PlanningModification.findById(id);
        if (!modification) {
            return res.status(404).json({ error: 'Modification non trouvée' });
        }

        // Vérifier que l'admin a les droits sur ce centre
        const admin = await User.findById(adminId);
        if (!admin.isAdmin || (admin.adminType === 'local' && admin.centerId?.toString() !== modification.centerId.toString())) {
            return res.status(403).json({ 
                error: 'Vous n\'avez pas les droits pour modifier cette demande' 
            });
        }

        // Mettre à jour le statut
        modification.status = status;
        modification.approvedBy = adminId;
        modification.approvedAt = new Date();
        
        if (comment) {
            modification.comment = comment;
        }

        await modification.save();

        // Populate les références pour la réponse
        await modification.populate('userId', 'name lastName email');
        await modification.populate('centerId', 'name');
        await modification.populate('approvedBy', 'name lastName');

        res.json({
            message: `Modification ${status === 'approved' ? 'approuvée' : 'rejetée'} avec succès`,
            modification
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        res.status(500).json({ 
            error: 'Une erreur est survenue lors de la mise à jour du statut' 
        });
    }
};

// Supprimer une modification (seulement par l'utilisateur qui l'a créée)
const deleteModification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const modification = await PlanningModification.findById(id);
        if (!modification) {
            return res.status(404).json({ error: 'Modification non trouvée' });
        }

        // Vérifier que l'utilisateur est le propriétaire de la modification
        if (modification.userId.toString() !== userId) {
            return res.status(403).json({ 
                error: 'Vous n\'avez pas les droits pour supprimer cette modification' 
            });
        }

        // Vérifier que la modification n'est pas déjà approuvée
        if (modification.status === 'approved') {
            return res.status(400).json({ 
                error: 'Impossible de supprimer une modification déjà approuvée' 
            });
        }

        await PlanningModification.findByIdAndDelete(id);

        res.json({ message: 'Modification supprimée avec succès' });

    } catch (error) {
        console.error('Erreur lors de la suppression de la modification:', error);
        res.status(500).json({ 
            error: 'Une erreur est survenue lors de la suppression de la modification' 
        });
    }
};

// Obtenir une modification spécifique
const getModification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const modification = await PlanningModification.findById(id)
            .populate('userId', 'name lastName email')
            .populate('centerId', 'name')
            .populate('teamId', 'name')
            .populate('approvedBy', 'name lastName');

        if (!modification) {
            return res.status(404).json({ error: 'Modification non trouvée' });
        }

        // Vérifier que l'utilisateur a les droits pour voir cette modification
        const user = await User.findById(userId);
        if (!user.isAdmin && modification.userId.toString() !== userId) {
            return res.status(403).json({ 
                error: 'Vous n\'avez pas les droits pour voir cette modification' 
            });
        }

        res.json(modification);

    } catch (error) {
        console.error('Erreur lors de la récupération de la modification:', error);
        res.status(500).json({ 
            error: 'Une erreur est survenue lors de la récupération de la modification' 
        });
    }
};

// Mettre à jour une modification (seulement par l'utilisateur qui l'a créée)
const updateModification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const { startTime, endTime, comment } = req.body;

        const modification = await PlanningModification.findById(id);
        if (!modification) {
            return res.status(404).json({ error: 'Modification non trouvée' });
        }

        // Vérifier que l'utilisateur est le propriétaire de la modification
        if (modification.userId.toString() !== userId) {
            return res.status(403).json({ 
                error: 'Vous n\'avez pas les droits pour modifier cette demande' 
            });
        }

        // Vérifier que la modification n'est pas déjà approuvée
        if (modification.status === 'approved') {
            return res.status(400).json({ 
                error: 'Impossible de modifier une modification déjà approuvée' 
            });
        }

        // Mettre à jour les champs
        if (startTime !== undefined) modification.startTime = startTime;
        if (endTime !== undefined) modification.endTime = endTime;
        if (comment !== undefined) modification.comment = comment;

        modification.updatedAt = new Date();
        await modification.save();

        // Populate les références pour la réponse
        await modification.populate('userId', 'name lastName email');
        await modification.populate('centerId', 'name');

        res.json({
            message: 'Modification mise à jour avec succès',
            modification
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de la modification:', error);
        res.status(500).json({ 
            error: 'Une erreur est survenue lors de la mise à jour de la modification' 
        });
    }
};

export {
    createModification,
    getUserModifications,
    getCenterModifications,
    updateModificationStatus,
    deleteModification,
    getModification,
    updateModification
};
