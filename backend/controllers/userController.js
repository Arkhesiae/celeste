const {v4: uuidv4} = require('uuid');
const User = require('../models/User');
const Center = require('../models/Center');
const {hash} = require("bcrypt");
const Team = require('../models/Team');
const {getTeamAtGivenDate} = require("../utils/getTeamAtGivenDate");
const {computeShiftOfUser} = require("../utils/computeShiftOfUser.js");
const {computeShiftOfUserWithSubstitutions} = require("../utils/computeShiftOfUserWithSubstitutions.js");
const Transaction = require('../models/Transaction');
const { createDelayedTransaction, processPendingTransactions } = require('../services/transactionService');
const path = require('path');
const fs = require('fs');

// Créer un nouvel utilisateur
const createUser = async (req, res) => {
    const {name, lastName, password, email, centerId, team, zone} = req.body;
    
    try {
        const hashedPassword = await hash(password, 10);
        const user = new User({
            name,
            lastName,
            email,
            id: uuidv4(),
            password: hashedPassword,
            centerId
        });
        const firstTeam = await Team.findById(team);
        if (!firstTeam) {
            return res.status(404).json({message: 'Equipe non trouvée'});
        }
        user.teams.push({teamId: firstTeam._id, fromDate: new Date(), toDate: null});

        await user.save();
        res.json({status: 'Utilisateur créé avec succès.', user: user});
    } catch (err) {
        res.status(500).json({message: err.message});
    }
};

// Vérifier la disponibilité d'un email
const checkEmailAvailability = async (req, res) => {
    const { email } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        res.json({ available: !existingUser });
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'email:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};

// Obtenir tous les utilisateurs
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({message: 'Erreur interne du serveur'});
    }
};

// Obtenir un compte utilisateur par ID
const getUserById = (req, res) => {
    const {id} = req.params;
    User.findById(id)
        .then((user) => {
            if (!user) {
                return res.status(404).json({error: 'User not found.'});
            }
            res.json(user);
        })
        .catch((err) => res.status(500).json({message: err.message}));
};

// Supprimer un compte utilisateur par ID
const deleteUserById = (req, res) => {
    const {id} = req.params;
    User.findByIdAndDelete(id)
        .then((user) => {
            if (!user) {
                return res.status(404).json({error: 'User not found.'});
            }
            res.json("User deleted successfully");
        })
        .catch((err) => res.status(500).json({message: err.message}));
};




// Approuver un utilisateur
const approveUser = async (req, res) => {
    const {id} = req.params;

    try {
        const user = await User.findByIdAndUpdate(id, {status: 'approved'}, {new: true});
        if (!user) {
            return res.status(404).json({message: 'Utilisateur non trouvé'});
        }
        res.status(200).json({message: 'Utilisateur approuvé avec succès', user});
    } catch (error) {
        console.error('Erreur lors de l\'approbation de l\'utilisateur:', error);
        res.status(500).json({message: 'Erreur interne du serveur'});
    }
};

// Promouvoir un utilisateur en administrateur
const makeUserAdmin = async (req, res) => {
    const {id} = req.params;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({message: 'Utilisateur non trouvé'});
        }

        if (!user.centerId) {
            return res.status(404).json({message: 'Aucun centre trouvé pour cet utilisateur'});
        }

        user.isAdmin = true;
        user.adminType = "local";
        await user.save();

        res.json({message: 'Utilisateur promu administrateur local avec succès'});
    } catch (error) {
        console.error('Erreur lors de la promotion de l\'utilisateur:', error);
        res.status(500).json({message: 'Échec de la promotion de l\'utilisateur en administrateur'});
    }
};

// Assigner un utilisateur à un centre
const assignUserToCenter = async (req, res) => {
    const userId = req.params.id;
    const {centerId: newCenterId} = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({error: 'Utilisateur non trouvé'});
        }

        if (user.centerId === newCenterId) {
            return res.status(400).json({error: 'L\'utilisateur est déjà assigné à ce centre'});
        }

        user.centerId = newCenterId;
        user.isLocalAdmin = false;
        await user.save();

        res.status(200).json({message: 'Utilisateur assigné avec succès au nouveau centre'});
    } catch (error) {
        console.error('Erreur lors de l\'assignation de l\'utilisateur à un nouveau centre:', error);
        res.status(500).json({error: 'Erreur interne du serveur'});
    }
};

// Obtenir les utilisateurs d'un centre spécifique
const getUsersByCenter = async (req, res) => {
    const {centerId} = req.params;

    try {
        const users = await User.find({centerId}).populate('teams');
        if (!users.length) {    
            res.status(200).json([]);
        }

        const usersWithCurrentTeam = await Promise.all(users.map(async (user) => {
            const currentTeam = await getTeamAtGivenDate(user.teams, new Date());
            return {
                ...user.toObject(),
                currentTeam
            };
        }));

        res.status(200).json(usersWithCurrentTeam);
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs pour un centre:', error);
        res.status(500).json({message: 'Une erreur est survenue lors de la récupération des utilisateurs.'});
    }
};

// Fonction utilitaire pour récupérer un utilisateur et ses équipes
const getUserWithTeams = async (userId) => {
    const user = await User.findById(userId).populate('teams');
    if (!user) {
        throw new Error('User not found');
    }
    return user;
};

// Fonction utilitaire pour obtenir une équipe à une date donnée
const getTeamAtDate = async (teams, date) => {
    const teamOccurrence = await getTeamAtGivenDate(teams, date);
    if (!teamOccurrence) {
        throw new Error('No team found for the given date');
    }

    const team = await Team.findById(teamOccurrence.teamId);
    if (!team || team.deleted) {
        throw new Error('Team not found');
    }
    return {
        ...teamOccurrence.toObject(),
        name: team.name,
        cycleStartDate: team.cycleStartDate,
        type: teamOccurrence.toDate ? "Renfort" : "Changement"
    };
};

// Obtenir l'équipe d'un utilisateur à une date spécifique
const getUserTeamAtDate = async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ message: 'Date is required' });
    }

    try {
        const user = await getUserWithTeams(id);
        const result = await getTeamAtDate(user.teams, new Date(date));
        res.json(result);
    } catch (error) {
        console.error('Error fetching team:', error);
        res.status(404).json({ message: error.message });
    }
};

// Obtenir l'équipe actuelle d'un utilisateur
const getUserCurrentTeam = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await getUserWithTeams(id);
        const result = await getTeamAtDate(user.teams, new Date());
        res.json(result);
    } catch (error) {
        console.error('Error fetching current team:', error);
        res.status(404).json({ message: error.message });
    }
};

// Obtenir les changements d'équipe d'un utilisateur
const getUserTeamOccurrences = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await getUserWithTeams(id);
        const now = new Date();
        const sortedOccurrences = user.teams.sort((a, b) => 
            new Date(a.fromDate) - new Date(b.fromDate)
        );


        const categorizedOccurrences = {
            permanentTeam: null,
            temporaryTeam: null,
            nextOccurrences: [],
            allOccurrences: []
        };

        for (const occurrence of sortedOccurrences) {
            const occurrenceObj = occurrence.toObject();
            const startDate = new Date(occurrenceObj.fromDate);
            const endDate = occurrenceObj.toDate ? new Date(occurrenceObj.toDate) : null;
            const team = await Team.findById(occurrenceObj.teamId);

            if (!team || team.deleted) continue;

            const occurrenceWithTeam = {
                ...occurrenceObj,
                teamName: team.name,
                type: endDate ? "Renfort" : "Changement"
            };

            if (startDate <= now && endDate && endDate >= now) {
                categorizedOccurrences.temporaryTeam = occurrenceWithTeam;
            }

            if (startDate <= now && !endDate) {
                categorizedOccurrences.permanentTeam = occurrenceWithTeam;
            }

            if (startDate > now) {
                categorizedOccurrences.nextOccurrences.push(occurrenceWithTeam);
            }

            categorizedOccurrences.allOccurrences.push(occurrenceWithTeam);
        }

        res.json(categorizedOccurrences);
    } catch (error) {
        console.error("Error fetching team occurrences:", error);
        res.status(404).json({ message: error.message });
    }
};

// Obtenir les utilisateurs groupés par équipe
const getUsersAndGroupByTeam = async (req, res) => {
    // Validation de la date
    let date;
    try {
        date = req.query.date ? new Date(req.query.date) : new Date();
        if (isNaN(date.getTime())) {
            return res.status(400).json({message: 'Date invalide'});
        }
    } catch (error) {
        return res.status(400).json({message: 'Format de date invalide'});
    }

    const centerId = req.params.centerId;
    if (!centerId) {
        return res.status(400).json({message: 'ID du centre requis'});
    }

    try {
        // Récupération simultanée du centre et des équipes
        const [center, teams, users] = await Promise.all([
            Center.findById(centerId),
            Team.find({center: centerId}),
            User.find({centerId})
        ]);

        if (!center) {
            return res.status(404).json({message: 'Centre non trouvé'});
        }

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
                .sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate));

            // Traitement de l'équipe principale
            const mainTeamOccurrence = validOccurrences.find(occurrence => 
                new Date(occurrence.fromDate) <= date && !occurrence.toDate
            );

            if (mainTeamOccurrence) {
                const teamResult = resultMap.get(mainTeamOccurrence.teamId.toString());
                if (teamResult) {
                    teamResult.users.push({
                        userId: user._id,
                        name: user.name,
                        lastName: user.lastName,
                        fromDate: mainTeamOccurrence.fromDate,
                        toDate: mainTeamOccurrence.toDate
                    });
                }
            }

            // Traitement des renforts
            for (const occurrence of validOccurrences) {
                if (occurrence.toDate) {
                    const teamResult = resultMap.get(occurrence.teamId.toString());
                    if (teamResult && 
                        new Date(occurrence.fromDate) <= date && 
                        new Date(occurrence.toDate) >= date) {
                        teamResult.renforts.push({
                            userId: user._id,
                            name: user.name,
                            lastName: user.lastName,
                            fromDate: occurrence.fromDate,
                            toDate: occurrence.toDate
                        });
                    }
                }
            }
        }

        res.status(200).json(result);
    } catch (err) {
        console.error("Erreur lors de l'agrégation:", err);
        res.status(500).json({error: "Une erreur est survenue lors du traitement des données."});
    }
};



// Supprimer une occurrence d'équipe
const deleteTeamOccurrence = async (req, res) => {
    try {
        const {id, occurrenceId} = req.params;
        const user = await User.findOneAndUpdate(
            {_id: id},
            {$pull: {teams: {_id: occurrenceId}}},
            {new: true}
        );

        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }

        res.status(200).json({message: 'Team occurrence deleted successfully'});
    } catch (error) {
        console.error("Error deleting team occurrence:", error);
        res.status(500).json({message: "Internal server error"});
    }
};

// Assigner une équipe à un utilisateur
const assignTeamToUser = async (req, res) => {
    const {id} = req.params;
    const newTeam = req.body;

    if (!newTeam.teamId || !newTeam.fromDate) {
        return res.status(400).json({error: "teamId and fromDate are required"});
    }

    try {
        const teamExists = await Team.findById(newTeam.teamId);
        if (!teamExists) {
            return res.status(404).json({error: "Team not found"});
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({message: "User not found"});

        user.teams.push({teamId: newTeam.teamId, fromDate: newTeam.fromDate, toDate: newTeam.toDate});
        await user.save();
        res.send(user.teams);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// Obtenir les vacances d'un utilisateur
const getUserShifts = async (req, res) => {
    try {
        const {dates} = req.body;
        const {id: userId} = req.params;

        if (!dates || !userId) {
            return res.status(400).json({message: !dates ? 'No dates provided' : 'No user provided'});
        }

        const results = await computeShiftOfUser(dates, userId);
        res.json(results);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({error: error.message});
    }
};


// Obtenir les vacances d'un utilisateur
const getUserShiftsWithSubstitutions = async (req, res) => {
    try {
        const {dates} = req.body;
        const {id: userId} = req.params;

        if (!dates || !userId) {
            return res.status(400).json({message: !dates ? 'No dates provided' : 'No user provided'});
        }

        const results = await computeShiftOfUserWithSubstitutions(dates, userId);
        res.json(results);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({error: error.message});
    }
};


// Mettre à jour les préférences d'un utilisateur
const updateUserPreferences = async (req, res) => {
    const {id} = req.params;
    const {preferences} = req.body;

    try {
        const user = await User.findByIdAndUpdate(
            id,
            {$set: {preferences}},
            {new: true}
        );

        if (!user) {
            return res.status(404).json({message: 'Utilisateur non trouvé'});
        }

        res.json({message: 'Préférences mises à jour avec succès', preferences: user.preferences});
    } catch (error) {
        console.error('Erreur lors de la mise à jour des préférences:', error);
        res.status(500).json({message: 'Erreur interne du serveur'});
    }
};

// Obtenir les préférences d'un utilisateur
const getUserPreferences = async (req, res) => {
    const {id} = req.params;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({message: 'Utilisateur non trouvé'});
        }

        res.json({preferences: user.preferences});
    } catch (error) {
        console.error('Erreur lors de la récupération des préférences:', error);
        res.status(500).json({message: 'Erreur interne du serveur'});
    }
};


const getPointsById = (req, res) => {
    const id = req.params.id;
    User.findById(id)
        .then((user) => {
            if (!user) {
                return res.status(404).json({message: 'User not found.'});
            }
            res.json({ points: user.points });

        })
        .catch((err) => res.status(500).json({message: err.message}));
}

/**
 * Effectue un transfert de points entre utilisateurs
 */
const transferPoints = async (req, res) => {
    try {
        const { toUserId, amount, description, type, scheduledDate } = req.body;
        const fromUserId = req.user.userId;

        // Vérification des paramètres
        if (!toUserId || !amount || amount <= 0) {
            return res.status(400).json({ message: 'Paramètres invalides' });
        }

        // Vérification que l'utilisateur ne se transfère pas à lui-même
        if (fromUserId === toUserId) {
            return res.status(400).json({ message: 'Vous ne pouvez pas vous transférer des points à vous-même' });
        }

        // Récupération des utilisateurs
        const sender = await User.findById(fromUserId);
        const receiver = await User.findById(toUserId);

        if (!sender || !receiver) {
            return res.status(404).json({message: 'Utilisateur non trouvé' });
        }

        const amountInt = parseInt(amount);
        console.log(scheduledDate)
        // Si la date d'effectivité est dans le futur, créer une transaction différée
        if (scheduledDate) {
            const transaction = await createDelayedTransaction({
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
        if (sender.points - amount < 0) {
            return res.status(400).json({ message: 'Solde insuffisant' });
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
        res.status(500).json({ error: 'Erreur serveur lors du transfert' });
    }
};

/**
 * Récupère l'historique des transactions d'un utilisateur
 */
const getTransactionHistory = async (req, res) => {
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
        .populate('sender', 'name')
        .populate('receiver', 'name');

        res.status(200).json(transactions);
    } catch (error) {
        console.error('Erreur lors de la récupération des transactions:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des transactions' });
    }
};

const updateAvatar = async (req, res) => {
    console.log("req.file");
  try {
    const { id } = req.params;
    const avatar = req.file;

    if (!avatar) {
      return res.status(400).json({ message: 'Aucune image fournie' });
    }

    console.log(avatar);

    // Vérifier le type de fichier
    if (!avatar.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Le fichier doit être une image' });
    }

    console.log(avatar.mimetype);

    // Vérifier la taille du fichier (max 5MB)
    if (avatar.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'L\'image ne doit pas dépasser 5MB' });
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
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ avatar: user.avatar });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'avatar:', error);
    
    // Gestion spécifique des erreurs multer
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'L\'image ne doit pas dépasser 5MB' });
    }
    
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'avatar' });
  }
};

// Mettre à jour l'email de l'utilisateur
const updateEmail = async (req, res) => {
    const { email } = req.body;
    const userId = req.user.userId; // Récupéré depuis le middleware d'authentification

    try {
        // Vérifier si le nouvel email est déjà utilisé
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Cette adresse email est déjà utilisée' });
        }

        // Mettre à jour l'email
        const user = await User.findByIdAndUpdate(
            userId,
            { email },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.json({ message: 'Email mis à jour avec succès', user });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'email:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'email' });
    }
};

// Récupérer les informations d'un utilisateur par email
const getUserInfoByEmail = async (req, res) => {
    const { email } = req.params;

    try {
        const user = await User.findOne({ email })
            .select('name lastName avatar isAdmin adminType')
            .populate('centerId', 'name');

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Déterminer le rôle de l'utilisateur
        let role = 'utilisateur';
        if (user.isAdmin) {
            role = user.adminType === 'master' ? 'administrateur principal' : 'administrateur local';
        }

        res.json({
            name: `${user.name} ${user.lastName}`,
            avatar: user.avatar,
            role: role,
            center: user.centerId?.name || ''
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des informations utilisateur:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};

// Exporter les fonctions du module
module.exports = {
    createUser,
    getAllUsers,
    getUserById,
    deleteUserById,

    getPointsById,
    approveUser,
    makeUserAdmin,
    assignUserToCenter,
    getUsersByCenter,
    getUserTeamAtDate,
    getUserCurrentTeam,
    getUsersAndGroupByTeam,
    getUserTeamOccurrences,
    deleteTeamOccurrence,
    assignTeamToUser,
    getUserShifts,
    getUserShiftsWithSubstitutions,
    updateUserPreferences,
    getUserPreferences,
    transferPoints,
    getTransactionHistory,
    updateAvatar,
    checkEmailAvailability,
    updateEmail,
    getUserInfoByEmail
};
