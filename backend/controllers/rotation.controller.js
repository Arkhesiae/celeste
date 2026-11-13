import * as rotationService from '../services/rotation/index.js';

/**
 * Tours de service : ce fichier ne fait que lire la requête, appeler le service (`services/rotation/`) et répondre.
 */

// Sauvegarder un nouveau tour de service. Le centre vient de l'URL (POST /rotation/center/:centerId), déjà vérifié par authorizeCenterParam
const saveRotation = async (req, res, next) => {
    try {
        const newRotation = await rotationService.createRotation(req.body, req.params.centerId);
        res.status(201).json({ message: 'Tour de service enregistré', rotation: newRotation });
    } catch (error) {
        next(error);
    }
};

// Obtenir tous les tours de service
const getAllRotations = async (req, res, next) => {
    try {
        res.json(await rotationService.listRotations());
    } catch (error) {
        next(error);
    }
};

// Obtenir les tours de service d'un centre spécifique
const getRotationsByCenter = async (req, res, next) => {
    try {
        res.json(await rotationService.listRotationsOfCenter(req.params.centerId));
    } catch (error) {
        next(error);
    }
};

// Obtenir tous les tours de service avec leur statut
const getAllRotationsWithStatus = async (req, res, next) => {
    try {
        res.json(await rotationService.listRotationsWithStatus(req.params.centerId));
    } catch (error) {
        next(error);
    }
};

// Obtenir le tour de service actif à une date donnée
const getActiveRotationAtDate = async (req, res, next) => {
    try {
        const date = req.query.date ? new Date(req.query.date) : new Date();
        res.json(await rotationService.getActiveRotationAtDate(req.centerId, date));
    } catch (err) {
        next(err);
    }
};

// Supprimer un tour de service
const deleteRotation = async (req, res, next) => {
    try {
        await rotationService.deleteRotation(req.params.id);
        res.json({ message: 'Rotation supprimée avec succès' });
    } catch (err) {
        next(err);
    }
};

/** Réponse commune aux ajouts / retraits de date d'activation : 409 = demande d'approbation (aperçu avec impacts) */
const activationDateHandler = (action) => async (req, res, next) => {
    try {
        const confirmed = req.body.confirmed === true;
        const result = await rotationService.changeActivationDate(action, req.params.id, req.body.activationDate, confirmed);

        return res.status(result.needsApproval ? 409 : 200).json({
            message: result.message,
            changes: result.changes ?? [],
            needsApproval: !!result.needsApproval
        });
    } catch (err) {
        next(err);
    }
};

// Ajouter (ou prévisualiser l'ajout d') une date d'activation
const addActivationDate = activationDateHandler('add');

// Supprimer (ou prévisualiser la suppression d') une date d'activation
const removeActivationDate = activationDateHandler('remove');

// Mettre à jour un jour dans une rotation
const updateDayInRotation = async (req, res, next) => {
    try {
        const rotation = await rotationService.updateDayInRotation(req.params.id, req.body.updatedDay);
        res.json({ message: 'Jour mis à jour avec succès', rotation });
    } catch (error) {
        next(error);
    }
};

// Dupliquer une rotation
const duplicateRotation = async (req, res, next) => {
    try {
        const rotation = await rotationService.duplicateRotation(req.params.id);
        res.status(201).json({ message: 'Tour de service dupliqué avec succès', rotation });
    } catch (error) {
        next(error);
    }
};

// Mettre à jour une rotation (son nom)
const updateRotation = async (req, res, next) => {
    try {
        const rotation = await rotationService.renameRotation(req.params.id, req.body);
        res.json({ message: 'Tour de service mis à jour avec succès', rotation });
    } catch (error) {
        next(error);
    }
};

export { saveRotation, getAllRotations, getRotationsByCenter, getAllRotationsWithStatus, getActiveRotationAtDate, deleteRotation, addActivationDate, removeActivationDate, updateDayInRotation, duplicateRotation, updateRotation };
