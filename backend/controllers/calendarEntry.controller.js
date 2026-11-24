import { isValidDate, assertDay } from '../utils/validation.js';
import { AppError } from '../error/AppError.js';
import * as calendarEntryService from '../services/calendarEntry/index.js';

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
        next(error);
    }
};

// Note d'un jour (`{ date, comment }`, commentaire vide : suppression), pour l'utilisateur du jeton
const setComment = async (req, res, next) => {
    try {
        const { date, comment } = req.body;
        assertDay(date);

        const result = await calendarEntryService.setDayComment(req.user.userId, date, comment);

        res.json({
            message: result.userShift?.[0]?.comment ? 'Commentaire enregistré' : 'Commentaire supprimé',
            ...result,
        });
    } catch (error) {
        next(error);
    }
};

// Obtenir les modifications d'un utilisateur pour une date donnée
const getUserEntries = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { date } = req.query;

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

        // Même opération que le retour au planning initial (deux routes, une seule fonction)
        const result = await calendarEntryService.restoreInitialShift(userId, date);

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

export {
    registerEntry,
    setComment,
    getUserEntries,
    undoMods,
    remove
};
