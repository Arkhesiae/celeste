import PlanningModification from '../models/PlanningModification.js';
import User from '../models/User.js';
import Substitution from '../models/Substitution.js';
import { computeShiftOfUserWithSubstitutions } from '../utils/computeShiftOfUserWithSubstitutions.js';

// Créer une nouvelle modification de planning
const registerModification = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type, date, comment, selectedVariation, shift, isOff } = req.body;

        // Validation des données requises
        if (!type || !date) {
            return res.status(400).json({ 
                error: 'Les champs type, date sont requis' 
            });
        }

 

        // Vérifier que l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        let modification = await PlanningModification.findOne({
            userId,
            date
        });
        
        if (modification) {
            modification.type = type;
            modification.selectedVariation = selectedVariation;
            modification.shift = shift;
            modification.comment = comment;
            modification.isOff = isOff ;
            modification.updatedAt = new Date();
         

        } else {
        // Vérifier que la date n'est pas dans le passé
        const modificationDate = new Date(date);


        // console.log(today)
        // today.setHours(0, 0, 0, 0);
        
        // if (modificationDate < today) {
        //     return res.status(400).json({ 
        //         error: 'Impossible de créer une modification pour une date passée' 
        //     });
        // }

        // Vérifier les conflits avec les substitutions
      
        // Créer la modification
        modification = new PlanningModification({
            userId,
            type,
            date: modificationDate,
            selectedVariation,
            shift,
            comment,
            centerId: user.centerId,
            isOff: isOff 
        });

            
        }
        await modification.save();
       
        const userShift = await computeShiftOfUserWithSubstitutions([date], userId);

        res.status(201).json({
            message: 'Modification de planning créée avec succès',
            userShift
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
        const { startDate, endDate, type } = req.query;

        let query = { userId };

        // Filtrer par période si fournie
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Filtrer par type si fourni
        if (type) {
            query.type = type;
        }

        const modifications = await PlanningModification.find(query)
            .populate('userId', 'name lastName email')
            .populate('centerId', 'name')
            .populate('teamId', 'name')
            .populate('selectedVariation')
            .populate('shift')
            .sort({ date: 1, createdAt: -1 });

        res.json(modifications);

    } catch (error) {
        console.error('Erreur lors de la récupération des modifications:', error);
        res.status(500).json({ 
            error: 'Une erreur est survenue lors de la récupération des modifications' 
        });
    }
};

// // Obtenir toutes les modifications d'un centre (pour les admins)
// const getCenterModifications = async (req, res) => {
//     try {
//         const { centerId } = req.params;
//         const { startDate, endDate, type } = req.query;

//         let query = { centerId };

//         // Filtrer par période si fournie
//         if (startDate && endDate) {
//             query.date = {
//                 $gte: new Date(startDate),
//                 $lte: new Date(endDate)
//             };
//         }

//         // Filtrer par type si fourni
//         if (type) {
//             query.type = type;
//         }

//         const modifications = await PlanningModification.find(query)
//             .populate('userId', 'name lastName email')
//             .populate('centerId', 'name')
//             .populate('teamId', 'name')
//             .populate('selectedVariation')
//             .populate('shift')
//             .sort({ date: 1, createdAt: -1 });

//         res.json(modifications);

//     } catch (error) {
//         console.error('Erreur lors de la récupération des modifications du centre:', error);
//         res.status(500).json({ 
//             error: 'Une erreur est survenue lors de la récupération des modifications' 
//         });
//     }
// };



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

        // Vérifier que la date n'est pas dans le passé
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (modification.date < today) {
            return res.status(400).json({ 
                error: 'Impossible de supprimer une modification pour une date passée' 
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
            .populate('selectedVariation')
            .populate('shift');

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
        const { selectedVariation, shift, comment, isOff, type } = req.body;

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

        // Vérifier que la date n'est pas dans le passé
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (modification.date < today) {
            return res.status(400).json({ 
                error: 'Impossible de modifier une modification pour une date passée' 
            });
        }

        // Validation du type si fourni
        if (type && !['absence', 'custom', 'selectedVariation'].includes(type)) {
            return res.status(400).json({ 
                error: 'Le type doit être "absence", "custom" ou "selectedVariation"' 
            });
        }

        // Mettre à jour les champs
        if (selectedVariation !== undefined) modification.selectedVariation = selectedVariation;
        if (shift !== undefined) modification.shift = shift;
        if (comment !== undefined) modification.comment = comment;
        if (isOff !== undefined) modification.isOff = isOff;
        if (type !== undefined) modification.type = type;

        modification.updatedAt = new Date();
        await modification.save();

        // Populate les références pour la réponse
        await modification.populate('userId', 'name lastName email');
        await modification.populate('centerId', 'name');
        await modification.populate('teamId', 'name');
        await modification.populate('selectedVariation');
        await modification.populate('shift');

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

// // Obtenir les shifts d'un utilisateur avec les modifications de planning
// const getUserShiftsWithModifications = async (req, res) => {
//     try {
//         const userId = req.user.userId;
//         const { dates } = req.body;

//         if (!dates || !Array.isArray(dates)) {
//             return res.status(400).json({ 
//                 error: 'Le paramètre dates est requis et doit être un tableau' 
//             });
//         }

//         // Utiliser la fonction computeShiftOfUserWithSubstitutions qui prend en compte les modifications
//         const shifts = await computeShiftOfUserWithSubstitutions(dates, userId);

//         res.json({
//             message: 'Shifts récupérés avec succès',
//             shifts
//         });

//     } catch (error) {
//         console.error('Erreur lors de la récupération des shifts:', error);
//         res.status(500).json({ 
//             error: 'Une erreur est survenue lors de la récupération des shifts' 
//         });
//     }
// };

export {
    registerModification,
    getUserModifications,
    // getCenterModifications,
    deleteModification,
    getModification,
    updateModification,
    // getUserShiftsWithModifications
};
