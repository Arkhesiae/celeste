import { assertId, assertEmail, assertDay, assertPositiveInteger, assertObject, isValidDateRange } from '../utils/validation.js';
import { AppError } from '../error/AppError.js';
import { MIN_PASSWORD_LENGTH } from '../config/auth.js';
import * as userShiftsService from '../services/user/user.shifts.js';
import { createUserService } from '../services/user/user.create.js';
import * as userService from '../services/user/user.list.js';
import * as userAccountService from '../services/user/user.account.js';
import * as userProfileService from '../services/user/user.profile.js';
import * as userPointsService from '../services/user/user.points.js';
import * as userTeamService from '../services/user/user.team.js';
import * as userTeamReadService from '../services/user/user.teamRead.js';
import * as teamTimelineService from '../services/user/user.teamTimeline.js';

/**
 * Utilisateurs : ce fichier lit et contrôle la requête, appelle le service (`services/user/`) et répond.
 *   user.create / user.list / user.account / user.profile / user.points / user.team / user.teamRead / user.teamTimeline / user.shifts
 *
 * Forme des réponses (les erreurs passent toutes par `next`, `errorHandler` les journalise et les met en forme) :
 *   - lecture (GET)      : la ressource elle-même (objet ou liste), sans enveloppe ;
 *   - écriture           : `{ message }`, plus la ressource concernée quand le client en a besoin (`user`, `preferences`, ...) ;
 *   - 409 `needsApproval` : aperçu des impacts d'un changement, à renvoyer avec `confirmed: true`.
 */

/** Texte obligatoire : chaîne non vide (espaces retirés) */
const requiredText = (value, label) => {
    if (typeof value !== 'string' || !value.trim()) {
        throw new AppError(`${label} requis`, 400);
    }
    return value.trim();
};

/** Données d'un nouveau compte, contrôlées ; ni `approved` ni `points` ne sont lus ici (voir les deux handlers) */
const readNewUser = (body) => {
    const { name, lastName, email, password, centerId, team } = assertObject(body);
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        throw new AppError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`, 400);
    }
    return {
        name: requiredText(name, 'Prénom'),
        lastName: requiredText(lastName, 'Nom'),
        email: assertEmail(email),
        password,
        centerId: assertId(centerId, 'ID du centre'),
        team: assertId(team, 'ID de l\'équipe')
    };
};

// Inscription (route publique) : le compte démarre toujours en attente d'approbation, avec 0 point, quoi que dise le corps
const createUser = async (req, res, next) => {
    try {
        const user = await createUserService({ ...readNewUser(req.body), approved: false, points: 0 });
        res.json({ message: 'Utilisateur créé avec succès.', user });
    } catch (err) {
        next(err);
    }
};

// Récupération de compte : `initiateAccountRecovery` (qui précède ce handler sur la route) a retrouvé l'ancien compte, le
// nouveau est donc approuvé d'emblée et reprend ses points
const createRecoveredUser = async (req, res, next) => {
    try {
        const { points } = req.body;
        if (!Number.isInteger(points) || points < 0) {
            throw new AppError('Points invalides', 400);
        }
        const user = await createUserService({ ...readNewUser(req.body), approved: true, points });
        res.json({ message: 'Utilisateur créé avec succès.', user });
    } catch (err) {
        next(err);
    }
};

// Vérifier la disponibilité d'un email
const checkEmailAvailability = async (req, res, next) => {
    try {
        res.json(await userAccountService.checkEmailAvailability(assertEmail(req.body.email)));
    } catch (error) {
        next(error);
    }
};

// Obtenir tous les utilisateurs
const getAllUsers = async (req, res, next) => {
    try {
        res.json(await userService.getAllUsers(req.user));
    } catch (error) {
        next(error);
    }
};

// Obtenir un compte utilisateur par ID
const getUserById = async (req, res, next) => {
    try {
        res.json(await userService.getUserById(assertId(req.params.id, 'ID utilisateur')));
    } catch (error) {
        next(error);
    }
};

// Supprimer un compte utilisateur par ID
const deleteUserById = async (req, res, next) => {
    try {
        await userAccountService.deleteUserById(assertId(req.params.id, 'ID utilisateur'));
        res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        next(error);
    }
};

// Approuver un utilisateur
const approveUser = async (req, res, next) => {
    try {
        const user = await userAccountService.approveUser(assertId(req.params.id, 'ID utilisateur'));
        res.json({ message: 'Utilisateur approuvé avec succès', user });
    } catch (error) {
        next(error);
    }
};

// Rejeter la candidature d'un utilisateur en attente
const deletePendingUser = async (req, res, next) => {
    try {
        const user = await userAccountService.rejectPendingUser(assertId(req.params.id, 'ID utilisateur'));
        res.json({ message: 'Candidature rejetée', user });
    } catch (error) {
        next(error);
    }
};

// Promouvoir un utilisateur en administrateur
const makeUserAdmin = async (req, res, next) => {
    try {
        await userAccountService.makeUserLocalAdmin(assertId(req.params.id, 'ID utilisateur'));
        res.json({ message: 'Utilisateur promu administrateur local avec succès' });
    } catch (error) {
        next(error);
    }
};

// Retirer le statut administrateur d'un utilisateur
const removeUserAdmin = async (req, res, next) => {
    try {
        await userAccountService.removeUserAdmin(assertId(req.params.id, 'ID utilisateur'));
        res.json({ message: 'Statut administrateur retiré avec succès' });
    } catch (error) {
        next(error);
    }
};

// Assigner un utilisateur à un centre
const assignUserToCenter = async (req, res, next) => {
    try {
        await userAccountService.assignUserToCenter(
            assertId(req.params.id, 'ID utilisateur'),
            assertId(req.body.centerId, 'ID du centre')
        );
        res.json({ message: 'Utilisateur assigné avec succès au nouveau centre' });
    } catch (error) {
        next(error);
    }
};

// Obtenir les utilisateurs d'un centre spécifique
const getUsersByCenter = async (req, res, next) => {
    try {
        res.json(await userService.getUsersByCenter(assertId(req.params.centerId, 'ID du centre'), req.user));
    } catch (error) {
        next(error);
    }
};

// Obtenir l'équipe d'un utilisateur à une date spécifique
const getUserTeamAtDate = async (req, res, next) => {
    try {
        const id = assertId(req.params.id, 'ID utilisateur');
        if (!req.query.date) {
            throw new AppError('Date requise', 400);
        }
        res.json(await userTeamReadService.getUserTeamAtDate(id, assertDay(req.query.date)));
    } catch (error) {
        next(error);
    }
};

// Obtenir l'équipe actuelle d'un utilisateur
const getUserCurrentTeam = async (req, res, next) => {
    try {
        res.json(await userTeamReadService.getUserCurrentTeam(assertId(req.params.id, 'ID utilisateur')));
    } catch (error) {
        next(error);
    }
};

// Obtenir les changements d'équipe d'un utilisateur
const getUserTeamOccurrences = async (req, res, next) => {
    try {
        res.json(await userTeamReadService.getUserTeamOccurrences(assertId(req.params.id, 'ID utilisateur')));
    } catch (error) {
        next(error);
    }
};

// Obtenir les utilisateurs groupés par équipe
const getUsersAndGroupByTeam = async (req, res, next) => {
    try {
        const centerId = assertId(req.params.centerId, 'ID du centre');
        const { date } = req.query;
        res.json(await userTeamReadService.getUsersGroupedByTeam(centerId, date ? assertDay(date) : undefined));
    } catch (error) {
        next(error);
    }
};

// Supprimer une occurrence d'équipe
const deleteTeamOccurrence = async (req, res, next) => {
    try {
        const id = assertId(req.params.id, 'ID utilisateur');
        const occurrenceId = assertId(req.params.occurrenceId, 'ID de l\'occurrence');
        const result = await userTeamService.deleteTeamOccurrence(id, occurrenceId, { confirmed: req.query.confirmed === 'true', actorId: req.user.userId });
        if (result.needsApproval) return res.status(409).json(result); // approbation requise : impact détaillé
        res.json({ message: 'Occurrence supprimée avec succès', changes: result.changes });
    } catch (error) {
        next(error);
    }
};

// Assigner une équipe à un utilisateur
const assignTeamToUser = async (req, res, next) => {
    try {
        const id = assertId(req.params.id, 'ID utilisateur');
        const { confirmed, replaceOccurrenceId, ...newTeam } = assertObject(req.body);
        if (replaceOccurrenceId !== undefined) {
            assertId(replaceOccurrenceId, 'ID de l\'occurrence à remplacer');
        }
        const result = await userTeamService.assignTeamToUser(id, newTeam, { confirmed: confirmed === true, replaceOccurrenceId, actorId: req.user.userId });
        if (result.needsApproval) return res.status(409).json(result); // approbation requise : impact détaillé
        res.json({ message: 'Équipe assignée avec succès', changes: result.changes });
    } catch (error) {
        next(error);
    }
};

// Obtenir les vacations d'un utilisateur
const getUserShiftsWithSubstitutions = async (req, res, next) => {
    try {
        const userId = assertId(req.params.id, 'ID utilisateur');
        const dates = assertObject(req.body.dates, 'Dates');

        if (typeof dates.startDate !== 'string' || typeof dates.endDate !== 'string') {
            throw new AppError('startDate et endDate sont requis', 400);
        }
        if (!isValidDateRange({ startDate: dates.startDate.slice(0, 10), endDate: dates.endDate.slice(0, 10) })) {
            throw new AppError('Intervalle de dates invalide (format ou cohérence)', 400);
        }

        res.json(await userShiftsService.getUserShifts(dates, userId));
    } catch (error) {
        next(error);
    }
};

// Mettre à jour les préférences d'un utilisateur
const updateUserPreferences = async (req, res, next) => {
    try {
        const id = assertId(req.params.id, 'ID utilisateur');
        const preferences = await userProfileService.updateUserPreferences(id, assertObject(req.body.preferences, 'Préférences'));
        res.json({ message: 'Préférences mises à jour avec succès', preferences });
    } catch (error) {
        next(error);
    }
};

// Obtenir les préférences d'un utilisateur
const getUserPreferences = async (req, res, next) => {
    try {
        res.json({ preferences: await userProfileService.getUserPreferences(assertId(req.params.id, 'ID utilisateur')) });
    } catch (error) {
        next(error);
    }
};

// Obtenir le solde de points d'un utilisateur
const getPointsById = async (req, res, next) => {
    try {
        res.json({ points: await userPointsService.getPoints(assertId(req.params.id, 'ID utilisateur')) });
    } catch (error) {
        next(error);
    }
};

// Effectue un transfert de points entre utilisateurs (l'émetteur est l'utilisateur connecté)
const transferPoints = async (req, res, next) => {
    try {
        const { toUserId, amount, description, type, scheduledDate } = req.body;
        if (description !== undefined && typeof description !== 'string') {
            throw new AppError('Description invalide', 400);
        }
        const result = await userPointsService.transferPoints({
            fromUserId: req.user.userId,
            toUserId: assertId(toUserId, 'ID du destinataire'),
            amount: assertPositiveInteger(amount, 'Montant'),
            description,
            type,
            scheduledDate: scheduledDate ? assertDay(scheduledDate, 'Date programmée') : undefined
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// Récupère l'historique des transferts de points de l'utilisateur connecté
const getTransactionHistory = async (req, res, next) => {
    try {
        const limit = req.query.limit === undefined ? 10 : assertPositiveInteger(req.query.limit, 'Limite');
        res.json(await userPointsService.getTransferHistory(req.user.userId, limit));
    } catch (error) {
        next(error);
    }
};

// Mettre à jour l'avatar (le fichier est reçu et limité en taille par multer, avant ce contrôleur)
const updateAvatar = async (req, res, next) => {
    try {
        const avatar = await userProfileService.updateAvatar(assertId(req.params.id, 'ID utilisateur'), req.file);
        res.json({ message: 'Avatar mis à jour avec succès', avatar });
    } catch (error) {
        next(error);
    }
};

// Mettre à jour l'email de l'utilisateur (l'identité vient du jeton)
const updateEmail = async (req, res, next) => {
    try {
        const user = await userProfileService.updateEmail(req.user.userId, assertEmail(req.body.email));
        res.json({ message: 'Email mis à jour avec succès', user });
    } catch (error) {
        next(error);
    }
};

const updatePhone = async (req, res, next) => {
    try {
        const { phone } = req.body;
        if (typeof phone !== 'string' || !phone.trim()) {
            throw new AppError('Numéro de téléphone invalide', 400);
        }
        const user = await userProfileService.updatePhone(req.user.userId, phone.trim());
        res.json({ message: 'Numéro de téléphone mis à jour avec succès', user });
    } catch (error) {
        next(error);
    }
};

const updateBirthDate = async (req, res, next) => {
    try {
        const user = await userProfileService.updateBirthDate(req.user.userId, assertDay(req.body.birthDate, 'Date de naissance'));
        res.json({ message: 'Date de naissance mise à jour avec succès', user });
    } catch (error) {
        next(error);
    }
};

const deletePhone = async (req, res, next) => {
    try {
        const user = await userProfileService.deletePhone(req.user.userId);
        res.json({ message: 'Numéro de téléphone supprimé avec succès', user });
    } catch (error) {
        next(error);
    }
};

// Récupérer les informations d'un utilisateur par email (route publique : écran de connexion)
const getUserInfoByEmail = async (req, res, next) => {
    try {
        res.json(await userProfileService.getUserLoginInfo(assertEmail(req.params.email)));
    } catch (error) {
        next(error);
    }
};

// Liste des utilisateurs de développement (le rôle est contrôlé par le service)
const getDevListUsers = async (req, res, next) => {
    try {
        res.json(await userService.listDevUsers(req.query.role));
    } catch (error) {
        next(error);
    }
};

// Frise des équipes d'un centre : membres passés, actuels et à venir de chaque équipe (3 mois avant / 9 mois après par défaut)
const getTeamsTimeline = async (req, res, next) => {
    try {
        res.json(await teamTimelineService.getCenterTeamsTimeline(assertId(req.params.centerId, 'ID du centre'), timelineWindow(req.query)));
    } catch (error) {
        next(error);
    }
};

// Frise des équipes d'un utilisateur : ses équipes (affectations permanentes et renforts) sur la fenêtre
const getUserTeamTimeline = async (req, res, next) => {
    try {
        res.json(await teamTimelineService.getUserTeamTimeline(assertId(req.params.id, 'ID utilisateur'), timelineWindow(req.query)));
    } catch (error) {
        next(error);
    }
};

/** Fenêtre `from` / `to` facultative d'une frise ; chaque borne présente doit être une date valide */
const timelineWindow = ({ from, to }) => ({
    from: from ? assertDay(from, 'Date de début') : undefined,
    to: to ? assertDay(to, 'Date de fin') : undefined
});

export {
    getTeamsTimeline,
    getUserTeamTimeline,
    createUser,
    createRecoveredUser,
    getAllUsers,
    getUserById,
    deleteUserById,
    getPointsById,
    approveUser,
    deletePendingUser,
    makeUserAdmin,
    removeUserAdmin,
    assignUserToCenter,
    getUsersByCenter,
    getUserTeamAtDate,
    getUserCurrentTeam,
    getUsersAndGroupByTeam,
    getUserTeamOccurrences,
    deleteTeamOccurrence,
    assignTeamToUser,
    getUserShiftsWithSubstitutions,
    updateUserPreferences,
    getUserPreferences,
    transferPoints,
    getTransactionHistory,
    updateAvatar,
    checkEmailAvailability,
    updateEmail,
    updatePhone,
    updateBirthDate,
    getUserInfoByEmail,
    getDevListUsers,
    deletePhone
};
