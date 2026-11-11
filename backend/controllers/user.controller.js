import User from '../models/User.js';
import { toDay } from '../utils/dates/dayFields.js';
import { occurrenceDays } from '../utils/dates/dayAccess.js';
import { getCenterTimeZone, getCenterTimeZones } from '../services/center/center.timezone.js';
import { toCalendarDay } from '../utils/dates/calendarDay.js';
import { todayIn } from '../utils/dates/plainDate.js';
import { findOrThrow } from '../utils/mongo.js';
import { fullName } from '../utils/names.js';
import { isValidId } from '../utils/ids.js';
import { LegacyUser } from '../models/User.js';
import Center from '../models/Center.js';
import Team from '../models/Team.js';
import { getTeamAtDay } from "../utils/getTeamAtDay.js";
import Transaction from '../models/Transaction.js';
import { createScheduledTransation } from '../services/transaction/transaction.scheduled.js';
import path from 'path';
import fs from 'fs';
import { isValidDateRange } from '../utils/validation.js';
import { fileURLToPath } from 'url';
import { sendEmailApproval, sendEmailRejection } from '../services/email/approvalEmail.js';
import * as userShiftsService from '../services/user/user.shifts.js';
import { createUserService } from '../services/user/user.create.js';
import * as userService from '../services/user/user.list.js';
import * as userTeamService from '../services/user/user.team.js';
import * as teamTimelineService from '../services/user/user.teamTimeline.js';
import { AppError } from '../error/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer un nouvel utilisateur
const createUser = async (req, res, next) => {
    try {
        const user = await createUserService(req.body);
        res.json({ status: 'Utilisateur créé avec succès.', user: user });
    } catch (err) {
        next(err)
    }
};

// Vérifier la disponibilité d'un email
const checkEmailAvailability = async (req, res, next) => {
    const { email } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        const existingLegacyUser = await LegacyUser.findOne({ email });
        res.json({ available: !existingUser, legacy: !!existingLegacyUser });
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'email:', error);
        next(error);
    }
};

// Obtenir tous les utilisateurs
const getAllUsers = async (req, res, next) => {
    try {
        // Master : tous les utilisateurs ; administrateur local : ceux de son centre uniquement (résolu par resolveCenterId)
        const isMaster = req.user.adminType === 'master';
        if (!isMaster && !req.user.centerId) throw new AppError('Accès refusé. Aucun centre associé.', 403);

        const users = await User.find(isMaster ? {} : { centerId: req.user.centerId }).populate('teams');

        // « Aujourd'hui » est le jour du centre de chaque utilisateur (fuseau du centre)
        const timeZones = await getCenterTimeZones(users.map((u) => u.centerId));

        const usersWithCurrentTeam = await Promise.all(users.map(async (user) => {
            const currentTeam = getTeamAtDay(user.teams, todayIn(timeZones.get(String(user.centerId))));
            return {
                ...user.toObject(),
                currentTeam
            };
        }));

        res.status(200).json(usersWithCurrentTeam);
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        next(error);
    }
};

// Obtenir un compte utilisateur par ID
const getUserById = (req, res, next) => {
    const { id } = req.params;
    User.findById(id)
        .then((user) => {
            if (!user) {
                throw new AppError('User not found.', 404);
            }
            res.json(user);
        })
        .catch(next);
};

// Supprimer un compte utilisateur par ID
const deleteUserById = (req, res, next) => {
    const { id } = req.params;
    User.findByIdAndDelete(id)
        .then((user) => {
            if (!user) {
                throw new AppError('User not found.', 404);
            }
            res.json("User deleted successfully");
        })
        .catch(next);
};



// Approuver un utilisateur
const approveUser = async (req, res, next) => {
    const { id } = req.params;

    try {
        const user = await User.findByIdAndUpdate(id, { registrationStatus: 'verified' }, { new: true });
        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        await sendEmailApproval(user.email)

        res.status(200).json({ message: 'Utilisateur approuvé avec succès', user });
    } catch (error) {
        console.error('Erreur lors de l\'approbation de l\'utilisateur:', error);
        next(error);
    }
};

// Supprimer un utilisateur
const deletePendingUser = async (req, res, next) => {
    const { id } = req.params;
    try {
        const user = await findOrThrow(User, id, { message: 'Utilisateur non trouvé' });
        if (user.registrationStatus !== 'pending') {
            throw new AppError('L\'utilisateur n\'est pas en attente d\'approbation', 400);
        }
        await User.findByIdAndDelete(id);
        await sendEmailRejection(user.email);

        res.status(200).json({ message: 'Candidature rejetée', user });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        next(error);
    }
};

// Promouvoir un utilisateur en administrateur
const makeUserAdmin = async (req, res, next) => {
    const { id } = req.params;

    try {
        const user = await findOrThrow(User, id, { message: 'Utilisateur non trouvé' });
        if (!user.centerId) {
            throw new AppError('Aucun centre trouvé pour cet utilisateur', 404);
        }

        user.isAdmin = true;
        user.adminType = "local";
        await user.save();

        res.json({ message: 'Utilisateur promu administrateur local avec succès' });
    } catch (error) {
        console.error('Erreur lors de la promotion de l\'utilisateur:', error);
        next(error);
    }
};

// Retirer le statut administrateur d'un utilisateur
const removeUserAdmin = async (req, res, next) => {
    const { id } = req.params;

    try {
        const user = await findOrThrow(User, id, { message: 'Utilisateur non trouvé' });
        // Vérifier que l'utilisateur n'est pas le dernier admin de son centre
        if (user.isAdmin && user.adminType === 'local') {
            const centerAdmins = await User.countDocuments({
                centerId: user.centerId,
                isAdmin: true,
                adminType: 'local'
            });

            if (centerAdmins <= 1) {
                throw new AppError('Impossible de retirer le statut admin : c\'est le dernier administrateur du centre', 400);
            }
        }

        user.isAdmin = false;
        user.adminType = null;
        await user.save();

        res.json({ message: 'Statut administrateur retiré avec succès' });
    } catch (error) {
        console.error('Erreur lors du retrait du statut administrateur:', error);
        next(error);
    }
};

// Assigner un utilisateur à un centre
const assignUserToCenter = async (req, res, next) => {
    const userId = req.params.id;
    const { centerId } = req.body;

    try {
        const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
        if (user.centerId === centerId) {
            throw new AppError('L\'utilisateur est déjà assigné à ce centre', 400);
        }

        user.centerId = centerId;
        user.teams = [];
        user.isLocalAdmin = false;
        await user.save();

        res.status(200).json({ message: 'Utilisateur assigné avec succès au nouveau centre' });
    } catch (error) {
        console.error('Erreur lors de l\'assignation de l\'utilisateur à un nouveau centre:', error);
        next(error);
    }
};

// Obtenir les utilisateurs d'un centre spécifique
const getUsersByCenter = async (req, res, next) => {
    const { centerId } = req.params;

    console.log("centerId", centerId);
    if (!centerId) {
        throw new AppError('ID du centre manquant', 400);
    }

    try {
        const usersWithCurrentTeam = await userService.getUsersByCenter(centerId, req.user);
        res.status(200).json(usersWithCurrentTeam);
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs pour un centre:', error);
        next(error);
    }
};

// Fonction utilitaire pour récupérer un utilisateur et ses équipes
// { fromDay, toDay } d'une occurrence (jumeaux « jour », repli sur les anciens champs) pour les réponses d'API
// TEMPORARY(day-fields): ajoute fromDay/toDay aux sorties d'API pour le front ; inutile quand l'API ne renverra plus que les jumeaux (le front lit deja les deux).
const dayBounds = (occurrence) => { const { from, to } = occurrenceDays(occurrence); return { fromDay: from, toDay: to }; };

const getUserWithTeams = async (userId) => {
    const user = await findOrThrow(User, userId, { message: 'User not found', populate: 'teams' });
    return user;
};

// Fonction utilitaire pour obtenir une équipe à une date donnée
const getTeamAtDate = async (teams, day) => {
    const teamOccurrence = getTeamAtDay(teams, day);
    if (!teamOccurrence) {
        throw new AppError('No team found for the given date', 404);
    }

    const team = await Team.findById(teamOccurrence.teamId);
    if (!team || team.deleted) {
        throw new AppError('Team not found', 404);
    }
    return {
        ...teamOccurrence.toObject(),
        name: team.name,
        cycleStartDate: team.cycleStartDate,
        type: occurrenceDays(teamOccurrence).to ? "Renfort" : "Changement"
    };
};

// Obtenir l'équipe d'un utilisateur à une date spécifique
const getUserTeamAtDate = async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
        throw new AppError('Date is required', 400);
    }

    try {
        const user = await getUserWithTeams(id);
        const day = toCalendarDay(date, await getCenterTimeZone(user.centerId));
        if (!day) throw new AppError('Date invalide', 400);
        const result = await getTeamAtDate(user.teams, day);
        res.json(result);
    } catch (error) {
        console.error('Error fetching team:', error);
        throw new AppError(error.message, 404);
    }
};

// Obtenir l'équipe actuelle d'un utilisateur
const getUserCurrentTeam = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await getUserWithTeams(id);
        const result = await getTeamAtDate(user.teams, todayIn(await getCenterTimeZone(user.centerId)));
        res.json(result);
    } catch (error) {
        console.error('Error fetching current team:', error);
        throw new AppError(error.message, 404);
    }
};

// Obtenir les changements d'équipe d'un utilisateur
const getUserTeamOccurrences = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await getUserWithTeams(id);
        // « Aujourd'hui » dans le fuseau du centre ; les bornes des occurrences sont lues en jours (jumeau, repli signalé)
        const today = todayIn(await getCenterTimeZone(user.centerId)).toString();
        const fromOf = (occurrence) => occurrenceDays(occurrence).from ?? '';
        const sortedOccurrences = [...user.teams].sort((a, b) => fromOf(a).localeCompare(fromOf(b)));


        const categorizedOccurrences = {
            permanentTeam: null,
            temporaryTeam: null,
            nextOccurrences: [],
            allOccurrences: []
        };

        for (const occurrence of sortedOccurrences) {
            const occurrenceObj = occurrence.toObject();
            const { from: startDay, to: endDay } = occurrenceDays(occurrence);
            const team = await Team.findById(occurrenceObj.teamId);

            if (!team || team.deleted) continue;

            const occurrenceWithTeam = {
                ...occurrenceObj,
                fromDay: startDay,
                toDay: endDay,
                teamName: team.name,
                type: endDay ? "Renfort" : "Changement"
            };

            if (startDay <= today && endDay && endDay >= today) {
                categorizedOccurrences.temporaryTeam = occurrenceWithTeam;
            }

            if (startDay <= today && !endDay) {
                categorizedOccurrences.permanentTeam = occurrenceWithTeam;
            }

            if (startDay > today) {
                categorizedOccurrences.nextOccurrences.push(occurrenceWithTeam);
            }

            categorizedOccurrences.allOccurrences.push(occurrenceWithTeam);
        }

        res.json(categorizedOccurrences);
    } catch (error) {
        console.error("Error fetching team occurrences:", error);
        throw new AppError(error.message, 404);
    }
};

// Obtenir les utilisateurs groupés par équipe
const getUsersAndGroupByTeam = async (req, res, next) => {
    // Validation de la date (le jour exact est résolu dans le fuseau du centre, plus bas)
    const requestedDate = req.query.date;
    if (requestedDate && !toCalendarDay(requestedDate)) {
        throw new AppError('Format de date invalide', 400);
    }

    const centerId = req.params.centerId;
    if (!centerId) {
        throw new AppError('ID du centre requis', 400);
    }

    try {
        // Récupération simultanée du centre et des équipes
        const [center, teams, users] = await Promise.all([
            Center.findById(centerId),
            Team.find({ center: centerId }),
            User.find({ centerId })
        ]);

        if (!center) {
            throw new AppError('Centre non trouvé', 404);
        }

        const day = requestedDate ? toCalendarDay(requestedDate, center.timeZone) : todayIn(center.timeZone);

        // Création d'un Map pour un accès rapide aux équipes
        const teamsMap = new Map(teams.map(team => [team._id.toString(), team]));

        // Préparation du résultat
        const result = teams.map(team => ({
            teamId: team._id,
            teamName: team.name,
            users: [],
            renforts: []
        }));

        // Création d'un Map pour un accès rapide aux résultats par équipe
        const resultMap = new Map(result.map(team => [team.teamId.toString(), team]));

        // Traitement des utilisateurs
        for (const user of users) {
            // Filtrage et tri des occurrences d'équipe
            const validOccurrences = user.teams
                .filter(occurrence => teamsMap.has(occurrence.teamId.toString()))
                .sort((a, b) => (occurrenceDays(b).from ?? '').localeCompare(occurrenceDays(a).from ?? ''));

            // Traitement de l'équipe principale
            const dayKey = day.toString();
            const mainTeamOccurrence = validOccurrences.find(occurrence => {
                const { from, to } = occurrenceDays(occurrence);
                return !to && from <= dayKey;
            });

            if (mainTeamOccurrence) {
                const teamResult = resultMap.get(mainTeamOccurrence.teamId.toString());
                if (teamResult) {
                    teamResult.users.push({
                        userId: user._id,
                        name: user.name,
                        lastName: user.lastName,
                        fromDate: mainTeamOccurrence.fromDate,
                        toDate: mainTeamOccurrence.toDate,
                        ...dayBounds(mainTeamOccurrence)
                    });
                }
            }

            // Traitement des renforts
            for (const occurrence of validOccurrences) {
                const { from, to } = occurrenceDays(occurrence);
                if (to) {
                    const teamResult = resultMap.get(occurrence.teamId.toString());
                    if (teamResult && from <= dayKey && to >= dayKey) {
                        teamResult.renforts.push({
                            userId: user._id,
                            name: user.name,
                            lastName: user.lastName,
                            fromDate: occurrence.fromDate,
                            toDate: occurrence.toDate,
                            ...dayBounds(occurrence)
                        });
                    }
                }
            }
        }

        res.status(200).json(result);
    } catch (err) {
        console.error("Erreur lors de l'agrégation:", err);
        next(err);
    }
};



// Supprimer une occurrence d'équipe
const deleteTeamOccurrence = async (req, res, next) => {
    const { id, occurrenceId } = req.params;
    try {
        const result = await userTeamService.deleteTeamOccurrence(id, occurrenceId, { confirmed: req.query.confirmed === 'true', actorId: req.user.userId });
        if (result.needsApproval) return res.status(409).json(result); // approbation requise : impact détaillé
        res.status(200).json({ message: "Occurrence supprimée avec succès", changes: result.changes });
    } catch (err) {
        next(err);
    }
};

// Assigner une équipe à un utilisateur
const assignTeamToUser = async (req, res, next) => {
    const { id } = req.params;
    try {
        const { confirmed, replaceOccurrenceId, ...newTeam } = req.body;
        const result = await userTeamService.assignTeamToUser(id, newTeam, { confirmed: confirmed === true, replaceOccurrenceId, actorId: req.user.userId });
        if (result.needsApproval) return res.status(409).json(result); // approbation requise : impact détaillé
        res.status(200).json({ message: "Équipe assignée avec succès", changes: result.changes });
    } catch (err) {
        next(err);
    }
};


// // Obtenir les vacances d'un utilisateur
// const getUserShifts = async (req, res) => {
//     try {
//         const { dates } = req.body;
//         const { id: userId } = req.params;

//         if (!dates || !userId) {
//             return res.status(400).json({ message: !dates ? 'No dates provided' : 'No user provided' });
//         }

//         const results = await computeShiftOfUser(dates, userId);
//         res.json(results);
//     } catch (error) {
//         console.error(error.message);
//         res.status(500).json({ error: error.message });
//     }
// };


// Obtenir les vacations d'un utilisateur
const getUserShiftsWithSubstitutions = async (req, res, next) => {
    try {
        const { dates } = req.body;
        const { id: userId } = req.params;

        if (!dates.startDate || !dates.endDate) {
            throw new AppError('startDate et endDate sont requis', 400);
        }

        if (!isValidDateRange({ startDate: dates.startDate.slice(0, 10), endDate: dates.endDate.slice(0, 10) })) {
            throw new AppError('Intervalle de dates invalide (format ou cohérence)', 400);
        }

        if (!userId || !isValidId(userId)) {
            throw new AppError('User ID invalide ou manquant', 400);
        }

        const shifts = await userShiftsService.getUserShifts(dates, userId)
        res.json(shifts);
    } catch (error) {
        console.error(error.message);
        next(error);
    }
};


// Mettre à jour les préférences d'un utilisateur
const updateUserPreferences = async (req, res, next) => {
    const { id } = req.params;
    const { preferences } = req.body;


    try {
        const user = await User.findByIdAndUpdate(
            id,
            { $set: { preferences } },
            { new: true }
        );

        console.log("User preferences :", user.preferences);

        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        res.json({ message: 'Préférences mises à jour avec succès', preferences: user.preferences });
    } catch (error) {
        console.error('Erreur lors de la mise à jour des préférences:', error);
        next(error);
    }
};

// Obtenir les préférences d'un utilisateur
const getUserPreferences = async (req, res, next) => {
    const { id } = req.params;

    try {
        const user = await findOrThrow(User, id, { message: 'Utilisateur non trouvé' });
        res.json({ preferences: user.preferences });
    } catch (error) {
        console.error('Erreur lors de la récupération des préférences:', error);
        next(error);
    }
};


const getPointsById = (req, res, next) => {
    const id = req.params.id;
    User.findById(id)
        .then((user) => {
            if (!user) {
                throw new AppError('User not found.', 404);
            }
            res.json({ points: user.points });

        })
        .catch(next);
}

/**
 * Effectue un transfert de points entre utilisateurs
 */
const transferPoints = async (req, res, next) => {
    try {
        const { toUserId, amount, description, type, scheduledDate } = req.body;
        const fromUserId = req.user.userId;

        // Vérification des paramètres
        if (!toUserId || !amount || amount <= 0) {
            throw new AppError('Paramètres invalides', 400);
        }

        // Vérification que l'utilisateur ne se transfère pas à lui-même
        if (fromUserId === toUserId) {
            throw new AppError('Vous ne pouvez pas vous transférer des points à vous-même', 400);
        }

        // Récupération des utilisateurs
        const sender = await User.findById(fromUserId);
        const receiver = await User.findById(toUserId);

        if (!sender || !receiver) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        const amountInt = parseInt(amount);
        // Si la date d'effectivité est dans le futur, créer une transaction différée
        if (scheduledDate) {
            const transaction = await createScheduledTransation({
                sender: fromUserId,
                receiver: toUserId,
                amount: amountInt,
                type: type || 'transfer',
                description,
                scheduledDate: new Date(scheduledDate)
            });

            return res.status(200).json({
                message: 'Transfert programmé avec succès',
                transaction
            });
        }

        // Pour les transferts immédiats, vérifier le solde
        if (sender.points - amount < -40) {
            throw new AppError('Solde insuffisant', 400);
        }

        // Création de la transaction immédiate
        const transaction = new Transaction({
            sender: fromUserId,
            receiver: toUserId,
            amount: amountInt,
            type: type || 'transfer',
            description,
            status: 'completed',
            effectiveDate: new Date()
        });

        // Mise à jour des soldes
        sender.points -= amountInt;
        receiver.points += amountInt;

        // Sauvegarde des modifications
        await Promise.all([
            transaction.save(),
            sender.save(),
            receiver.save()
        ]);

        res.status(200).json({
            message: 'Transfert effectué avec succès',
            transaction
        });
    } catch (error) {
        console.error('Erreur lors du transfert:', error);
        next(error);
    }
};

/**
 * Récupère l'historique des transactions d'un utilisateur
 */
const getTransactionHistory = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit) || 10;

        const transactions = await Transaction.find({
            $or: [
                { sender: userId },
                { receiver: userId }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('sender', 'name lastName _id')
            .populate('receiver', 'name lastName _id');

        res.status(200).json(transactions);
    } catch (error) {
        console.error('Erreur lors de la récupération des transactions:', error);
        next(error);
    }
};

const updateAvatar = async (req, res, next) => {
    try {
        const { id } = req.params;
        const avatar = req.file;

        if (!avatar) {
            throw new AppError('Aucune image fournie', 400);
        }


        // Vérifier le type de fichier
        if (!avatar.mimetype.startsWith('image/')) {
            throw new AppError('Le fichier doit être une image', 400);
        }


        // Vérifier la taille du fichier (max 10MB)
        if (avatar.size > 10 * 1024 * 1024) {
            throw new AppError('L\'image ne doit pas dépasser 10MB', 400);
        }


        // Déplacer le fichier vers le dossier public/avatars
        const uploadPath = path.join(__dirname, '../public/avatars', avatar.filename);
        await fs.promises.mkdir(path.dirname(uploadPath), { recursive: true });
        await fs.promises.rename(avatar.path, uploadPath);

        // Mettre à jour l'utilisateur dans la base de données
        const user = await User.findByIdAndUpdate(
            id,
            { avatar: `/avatars/${avatar.filename}` },
            { new: true }
        );

        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        res.json({ avatar: user.avatar });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'avatar:', error);

        // Gestion spécifique des erreurs multer
        if (error.code === 'LIMIT_FILE_SIZE') {
            throw new AppError('L\'image ne doit pas dépasser 5MB', 400);
        }

        next(error);
    }
};

// Mettre à jour l'email de l'utilisateur
const updateEmail = async (req, res, next) => {
    const { email } = req.body;
    const userId = req.user.userId; // Récupéré depuis le middleware d'authentification

    try {
        // Vérifier si le nouvel email est déjà utilisé
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('Cette adresse email est déjà utilisée', 400);
        }

        // Mettre à jour l'email
        const user = await User.findByIdAndUpdate(
            userId,
            { email },
            { new: true }
        );

        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        res.json({ message: 'Email mis à jour avec succès', user });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'email:', error);
        next(error);
    }
};

const updatePhone = async (req, res, next) => {
    const { phone } = req.body;
    const userId = req.user.userId; // Récupéré depuis le middleware d'authentification

    try {
        // Mettre à jour le numéro de téléphone dans personalData
        const user = await User.findByIdAndUpdate(
            userId,
            { 'personalData.phoneNumber': phone },
            { new: true }
        );

        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        res.json({ message: 'Numéro de téléphone mis à jour avec succès', user });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du numéro de téléphone:', error);
        next(error);
    }
};

const updateBirthDate = async (req, res, next) => {
    const { birthDate } = req.body;
    const userId = req.user.userId; // Récupéré depuis le middleware d'authentification

    try {
        // Mettre à jour la date de naissance dans personalData
        const user = await User.findByIdAndUpdate(
            userId,
            { 'personalData.birthDate': birthDate, 'personalData.birthDay': toDay(birthDate) },
            { new: true }
        );

        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        res.json({ message: 'Date de naissance mise à jour avec succès', user });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la date de naissance:', error);
        next(error);
    }
};

const deletePhone = async (req, res, next) => {
    const userId = req.user.userId; // Récupéré depuis le middleware d'authentification
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { 'personalData.phoneNumber': null },
            { new: true }
        );

        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        res.json({ message: 'Numéro de téléphone supprimé avec succès', user });
    } catch (error) {
        console.error('Erreur lors de la suppression du numéro de téléphone:', error);
        next(error);
    }
};

// Récupérer les informations d'un utilisateur par email
const getUserInfoByEmail = async (req, res, next) => {
    const { email } = req.params;

    try {
        const user = await User.findOne({ email })
            .select('name lastName avatar')
            .populate('centerId', 'name');

        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        // Route publique (écran de connexion) : uniquement ce qu'il affiche. Pas de rôle, pour ne pas révéler
        // qui sont les administrateurs.
        res.json({
            name: fullName(user),
            avatar: user.avatar,
            center: user.centerId?.name || ''
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des informations utilisateur:', error);
        next(error);
    }
};

const getDevListUsers = async (req, res, next) => {
    try {
        // Outil de connexion rapide réservé au développement : inexistant en production
        if (process.env.NODE_ENV === 'production') throw new AppError('Route introuvable', 404);

        const { role } = req.query;

        if (role === 'team') {
            // Agents test : tous les users rattachés à une équipe, hors master
            // (un agent promu admin local doit rester sélectionnable)
            const users = await User.find({
                isActive: true,
                adminType: { $ne: 'master' },
                'teams.0': { $exists: true },
            }).select('name lastName email teams centerId isAdmin adminType');

            return res.json(users);
        }

        // Pour l'instant, nous ne gérons que le cas 'team'
        throw new AppError('Rôle non supporté', 400);
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        next(error);
    }
};

// Exporter les fonctions du module
// Frise des équipes d'un centre : membres passés, actuels et à venir de chaque équipe (3 mois avant / 9 mois après par défaut)
const getTeamsTimeline = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        res.status(200).json(await teamTimelineService.getCenterTeamsTimeline(req.params.centerId, { from, to }));
    } catch (err) {
        next(err);
    }
};

// Frise des équipes d'un utilisateur : ses équipes (affectations permanentes et renforts) sur la fenêtre
const getUserTeamTimeline = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        res.status(200).json(await teamTimelineService.getUserTeamTimeline(req.params.id, { from, to }));
    } catch (err) {
        next(err);
    }
};

export {
    getTeamsTimeline,
    getUserTeamTimeline,
    createUser,
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
