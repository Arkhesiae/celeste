import { AppError } from '../error/AppError.js';
import { assertId, assertObject } from '../utils/validation.js';
import * as centerTransferService from '../services/centerTransfer/index.js';

/**
 * Mutations de centre : l'utilisateur agit sur sa propre demande (l'identité vient du jeton, jamais de l'adresse), les
 * administrateurs lisent les demandes de leur centre et acceptent celles qui arrivent chez eux.
 */

// Ma demande en cours (null : aucune)
export const getMine = async (req, res, next) => {
    try {
        res.json(await centerTransferService.getMyCenterTransfer(req.user.userId));
    } catch (error) {
        next(error);
    }
};

// Ce que l'acceptation effacerait : montré avant de déposer la demande
export const preview = async (req, res, next) => {
    try {
        res.json(await centerTransferService.previewCenterTransfer(req.user.userId));
    } catch (error) {
        next(error);
    }
};

export const request = async (req, res, next) => {
    try {
        const { toCenterId, reason } = assertObject(req.body);
        if (typeof reason !== 'string' || !reason.trim()) throw new AppError('Le motif est requis', 400);

        await centerTransferService.requestCenterTransfer(req.user.userId, {
            toCenterId: assertId(toCenterId, 'ID du centre'),
            reason: reason.trim(),
        });
        res.status(201).json({ message: 'Demande de mutation envoyée' });
    } catch (error) {
        next(error);
    }
};

export const cancel = async (req, res, next) => {
    try {
        await centerTransferService.cancelCenterTransfer(req.user.userId);
        res.json({ message: 'Demande de mutation annulée' });
    } catch (error) {
        next(error);
    }
};

// Administrateurs : les demandes qui arrivent dans leur centre ou en partent
export const list = async (req, res, next) => {
    try {
        res.json(await centerTransferService.listCenterTransfers(req.user));
    } catch (error) {
        next(error);
    }
};

export const accept = async (req, res, next) => {
    try {
        const result = await centerTransferService.acceptCenterTransfer(assertId(req.params.userId, 'ID utilisateur'), req.user);
        res.json({ message: 'Mutation acceptée', ...result });
    } catch (error) {
        next(error);
    }
};
