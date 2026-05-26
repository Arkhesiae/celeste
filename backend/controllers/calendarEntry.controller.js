import * as calendarEntryService from '../services/calendarEntry/calendar-entry.js';
import { isValidDate } from '../utils/validation.js';
import { AppError } from '../error/appError.js';


const registerEntry = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const data = req.body;

        if (!data.type || !data.date) {
            throw new AppError('Les champs type et date sont requis', 400);
        }

        if (!isValidDate(data.date)) {
            throw new AppError('La date est invalide', 400);
        }

        const result = await calendarEntryService.registerEntry(userId, data.date, data);

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
        next(error);
    }
};

// Restorer le initial shift
const restoreInitialShift = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { date } = req.body;

        if (!userId || !date) {
            throw new AppError('Les champs userId et date sont requis', 400);
        }

        if (!isValidDate(date)) {
            throw new AppError('La date est invalide', 400);
        }

        const result = await calendarEntryService.restoreInitialShift(userId, date);

        res.json({
            message: 'Retour au planning initial',
            ...result
        });

    } catch (error) {
        next(error);
    }
};

// Obtenir les modifications d'un utilisateur pour une date donnée
const getUserEntries = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { date } = req.body;

        if (!userId || !date) {
            throw new AppError('Les champs userId et date sont requis', 400);
        }

        if (!isValidDate(date)) {
            throw new AppError('La date est invalide', 400);
        }

        const modifications = await calendarEntryService.getUserEntries(userId, date);

        res.json(modifications);

    } catch (error) {
        next(error);
    }
};

const undoMods = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { date } = req.body;

        if (!userId || !date) {
            throw new AppError('Les champs userId et date sont requis', 400);
        }

        if (!isValidDate(date)) {
            throw new AppError('La date est invalide', 400);
        }

        const result = await calendarEntryService.undoMods(userId, date);

        res.json({
            message: 'Modifications annulées avec succès',
            ...result
        });

    } catch (error) {
        next(error);
    }
};

const remove = async (req, res, next) => {
    console.log("deleteAssignment")
    try {
        const userId = req.user.userId;
        const { date } = req.body;

        if (!userId || !date) {
            throw new AppError('Les champs userId et date sont requis', 400);
        }

        if (!isValidDate(date)) {
            throw new AppError('La date est invalide', 400);
        }

        console.log(userId, date);

        const result = await calendarEntryService.deleteAssignment(userId, date);

        console.log(result);
        res.json({
            message: 'Entrée supprimée avec succès',
            ...result
        });

    } catch (error) {
        console.log(error);
        next(error);
    }
};

// Supprimer une modification
const deleteModification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const result = await calendarEntryService.removeModification(id, userId);

        console.log(result);
        res.json({
            message: 'Modification supprimée avec succès',
            ...result
        });

    } catch (error) {
        next(error);
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
        next(error);
    }
};

export {
    registerEntry,
    restoreInitialShift,
    getUserEntries,
    deleteModification,
    getModification,
    undoMods,
    remove
};
