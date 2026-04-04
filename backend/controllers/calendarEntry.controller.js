import * as calendarEntryService from '../services/calendarEntry/calendarEntryService.js';
import { isValidDate } from '../utils/validation.js';

const VALID_TYPES = ['absence', 'custom', 'selectedVariation'];


const registerEntry = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { entryType, type, date, comment, selectedVariation, shift, isOff, confirmCreation, cancel } = req.body;

        if (!type || !date) {
            return res.status(400).json({ error: 'Les champs type et date sont requis' });
        }

        if (!isValidDate(date)) {
            return res.status(400).json({ error: 'La date est invalide' });
        }

        const result = await calendarEntryService.registerEntry(userId, date, {
            entryType,
            type,
            selectedVariation,
            shift,
            isOff,
            confirmCreation,
            cancel
        });

        res.status(201).json({
            message: 'Entrée ' + (result.type === "creation" ? "créée" : "modifiée") + ' avec succès',
            ...result
        });

    } catch (error) {
        if (error.status === 409) {
            console.error('Confirmation nécessaire');
            return res.status(409).json({
                message: error.message
            });
        }
        console.error('Erreur lors de la création de l\'entrée:', error);
        res.status(500).json({
            error: 'Une erreur est survenue lors de la création de l\'entrée'
        });
    }
};

// Restorer le initial shift
const restoreInitialShift = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { date } = req.body;

        if (!userId || !date) {
            return res.status(400).json({ error: 'Les champs userId et date sont requis' });
        }

        if (!isValidDate(date)) {
            return res.status(400).json({ error: 'La date est invalide' });
        }

        const result = await calendarEntryService.restoreInitialShift(userId, date);

        res.json({
            message: 'Retour au planning initial',
            ...result
        });

    } catch (error) {
        console.error('Erreur lors de la restauration du initial shift:', error);
        res.status(error.status ?? 500).json({
            error: error.status ? error.message : 'Une erreur est survenue lors de la restauration du initial shift'
        });
    }
};

// Obtenir les modifications d'un utilisateur pour une date donnée
const getUserEntries = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { date } = req.body;

        if (!userId || !date) {
            return res.status(400).json({ error: 'Les champs userId et date sont requis' });
        }

        if (!isValidDate(date)) {
            return res.status(400).json({ error: 'La date est invalide' });
        }

        const modifications = await calendarEntryService.getUserEntries(userId, date);

        res.json(modifications);

    } catch (error) {
        console.error('Erreur lors de la récupération des entrées:', error);
        res.status(error.status ?? 500).json({
            error: error.status ? error.message : 'Une erreur est survenue lors de la récupération des entrées'
        });
    }
};

// Supprimer une modification
const deleteModification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const result = await calendarEntryService.removeModification(id, userId);

        res.json({
            message: 'Modification supprimée avec succès',
            ...result
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'entrée:', error);
        res.status(error.status ?? 500).json({
            error: error.status ? error.message : 'Une erreur est survenue lors de la suppression de l\'entrée'
        });
    }
};

// Obtenir une modification spécifique
const getModification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const modification = await calendarEntryService.getModificationById(id, userId);

        res.json(modification);

    } catch (error) {
        console.error('Erreur lors de la récupération de l\'entrée:', error);
        res.status(error.status ?? 500).json({
            error: error.status ? error.message : 'Une erreur est survenue lors de la récupération de l\'entrée'
        });
    }
};

// Mettre à jour une modification
const updateModification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const { selectedVariation, shift, comment, isOff, type } = req.body;

        if (type && !VALID_TYPES.includes(type)) {
            return res.status(400).json({
                error: 'Le type doit être "absence", "custom" ou "selectedVariation"'
            });
        }

        const result = await calendarEntryService.patchModification(id, userId, {
            selectedVariation,
            shift,
            comment,
            isOff,
            type
        });

        
        res.json({
            message: 'Modification mise à jour avec succès',
            ...result
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de la modification:', error);
        res.status(error.status ?? 500).json({
            error: error.status ? error.message : 'Une erreur est survenue lors de la mise à jour de la modification'
        });
    }
};

export {
    registerEntry,
    // registerModification,
    restoreInitialShift,
    getUserEntries,
    deleteModification,
    getModification,
    updateModification
};
