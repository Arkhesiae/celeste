// controllers/request.controller.js
const Request = require('../models/request.model');
const Shift = require('../models/shift.model');
const User = require('../models/userModel');
const Transaction = require('../models/transaction.model');

/**
 * Crée une nouvelle demande de remplacement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.createReplacementRequest = async (req, res) => {
    try {
        const { shiftId, pointsOffered, comment, expiresAt } = req.body;
        const requesterId = req.user.id;

        // Vérification de l'existence de la vacation
        const shift = await Shift.findById(shiftId);
        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Vacation non trouvée.'
            });
        }

        // Vérification que l'utilisateur est bien propriétaire de la vacation
        if (shift.user.toString() !== requesterId) {
            return res.status(403).json({
                success: false,
                message: 'Vous ne pouvez demander un remplacement que pour vos propres vacations.'
            });
        }

        // Vérification du solde de points
        const requester = await User.findById(requesterId);
        if (requester.pointsBalance < pointsOffered) {
            return res.status(400).json({
                success: false,
                message: 'Solde de points insuffisant pour cette demande.'
            });
        }

        // Création de la demande
        const request = new Request({
            type: 'replacement',
            requester: requesterId,
            shiftRequested: shiftId,
            pointsOffered,
            comment,
            expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Par défaut : 7 jours
        });

        await request.save();

        // Marquer la vacation comme disponible pour échange
        shift.isAvailable = true;
        await shift.save();

        res.status(201).json({
            success: true,
            message: 'Demande de remplacement créée avec succès.',
            data: request
        });
    } catch (error) {
        console.log('Erreur lors de la création de la demande de remplacement:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la création de la demande.'
        });
    }
};

/**
 * Crée une nouvelle demande de permutation
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.createSwapRequest = async (req, res) => {
    try {
        const { shiftRequestedId, shiftOfferedId, comment, expiresAt } = req.body;
        const requesterId = req.user.id;

        // Vérification de l'existence des vacations
        const shiftRequested = await Shift.findById(shiftRequestedId);
        const shiftOffered = await Shift.findById(shiftOfferedId);

        if (!shiftRequested || !shiftOffered) {
            return res.status(404).json({
                success: false,
                message: 'Une ou plusieurs vacations non trouvées.'
            });
        }

        // Vérification que l'utilisateur est bien propriétaire de la vacation offerte
        if (shiftOffered.user.toString() !== requesterId) {
            return res.status(403).json({
                success: false,
                message: 'Vous ne pouvez offrir que vos propres vacations pour une permutation.'
            });
        }

        // Création de la demande
        const request = new Request({
            type: 'swap',
            requester: requesterId,
            shiftRequested: shiftRequestedId,
            shiftOffered: shiftOfferedId,
            comment,
            expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Par défaut : 7 jours
        });

        await request.save();

        // Marquer la vacation offerte comme disponible pour échange
        shiftOffered.isAvailable = true;
        await shiftOffered.save();

        res.status(201).json({
            success: true,
            message: 'Demande de permutation créée avec succès.',
            data: request
        });
    } catch (error) {
        console.log('Erreur lors de la création de la demande de permutation:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la création de la demande.'
        });
    }
};

/**
 * Crée une nouvelle demande de permutation flexible
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.createFlexibleSwapRequest = async (req, res) => {
    try {
        const { shiftOfferedId, pointsOffered, comment, expiresAt } = req.body;
        const requesterId = req.user.id;

        // Vérification de l'existence de la vacation offerte
        const shiftOffered = await Shift.findById(shiftOfferedId);

        if (!shiftOffered) {
            return res.status(404).json({
                success: false,
                message: 'Vacation non trouvée.'
            });
        }

        // Vérification que l'utilisateur est bien propriétaire de la vacation offerte
        if (shiftOffered.user.toString() !== requesterId) {
            return res.status(403).json({
                success: false,
                message: 'Vous ne pouvez offrir que vos propres vacations.'
            });
        }

        // Vérification du solde de points si nécessaire
        if (pointsOffered > 0) {
            const requester = await User.findById(requesterId);
            if (requester.pointsBalance < pointsOffered) {
                return res.status(400).json({
                    success: false,
                    message: 'Solde de points insuffisant pour cette demande.'
                });
            }
        }

        // Création de la demande
        const request = new Request({
            type: 'flexibleSwap',
            requester: requesterId,
            shiftOffered: shiftOfferedId,
            pointsOffered,
            comment,
            expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Par défaut : 7 jours
        });

        await request.save();

        // Marquer la vacation offerte comme disponible pour échange
        shiftOffered.isAvailable = true;
        await shiftOffered.save();

        res.status(201).json({
            success: true,
            message: 'Demande de permutation flexible créée avec succès.',
            data: request
        });
    } catch (error) {
        console.log('Erreur lors de la création de la demande de permutation flexible:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la création de la demande.'
        });
    }
};

/**
 * Accepte une demande de remplacement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.acceptReplacementRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const acceptorId = req.user.id;

        // Récupération de la demande
        const request = await Request.findById(requestId)
            .populate('shiftRequested')
            .populate('requester');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Demande non trouvée.'
            });
        }

        // Vérification que la demande est en attente
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cette demande est déjà ${request.status}.`
            });
        }

        // Vérification que ce n'est pas sa propre demande
        if (request.requester._id.toString() === acceptorId) {
            return res.status(400).json({
                success: false,
                message: 'Vous ne pouvez pas accepter votre propre demande.'
            });
        }

        // Mise à jour de la demande
        request.acceptor = acceptorId;
        request.status = 'accepted';
        await request.save();

        // Mise à jour de la vacation
        const shift = request.shiftRequested;
        shift.user = acceptorId;
        shift.isAvailable = false;
        await shift.save();

        // Création de la transaction de points
        if (request.pointsOffered > 0) {
            const transaction = new Transaction({
                sender: request.requester._id,
                receiver: acceptorId,
                request: requestId,
                points: request.pointsOffered,
                type: 'replacement'
            });
            await transaction.save();

            // Mise à jour des soldes de points
            await User.findByIdAndUpdate(
                request.requester._id,
                { $inc: { pointsBalance: -request.pointsOffered } }
            );

            await User.findByIdAndUpdate(
                acceptorId,
                { $inc: { pointsBalance: request.pointsOffered } }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Demande de remplacement acceptée avec succès.',
            data: request
        });
    } catch (error) {
        console.log('Erreur lors de l\'acceptation de la demande:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de l\'acceptation de la demande.'
        });
    }
};

/**
 * Accepte une demande de permutation
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.acceptSwapRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const acceptorId = req.user.id;

        // Récupération de la demande
        const request = await Request.findById(requestId)
            .populate('shiftRequested')
            .populate('shiftOffered')
            .populate('requester');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Demande non trouvée.'
            });
        }

        // Vérification que la demande est en attente
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cette demande est déjà ${request.status}.`
            });
        }

        // Vérification que c'est bien le propriétaire de la vacation demandée
        if (request.shiftRequested.user.toString() !== acceptorId) {
            return res.status(403).json({
                success: false,
                message: 'Vous devez être le propriétaire de la vacation demandée pour accepter cet échange.'
            });
        }

        // Mise à jour de la demande
        request.acceptor = acceptorId;
        request.status = 'accepted';
        await request.save();

        // Permutation des vacations
        const tempUser = request.shiftRequested.user;
        request.shiftRequested.user = request.shiftOffered.user;
        request.shiftOffered.user = tempUser;

        request.shiftRequested.isAvailable = false;
        request.shiftOffered.isAvailable = false;

        await request.shiftRequested.save();
        await request.shiftOffered.save();

        // Création de la transaction de points si nécessaire
        if (request.pointsOffered > 0) {
            const transaction = new Transaction({
                sender: request.requester._id,
                receiver: acceptorId,
                request: requestId,
                points: request.pointsOffered,
                type: 'swap'
            });
            await transaction.save();

            // Mise à jour des soldes de points
            await User.findByIdAndUpdate(
                request.requester._id,
                { $inc: { pointsBalance: -request.pointsOffered } }
            );

            await User.findByIdAndUpdate(
                acceptorId,
                { $inc: { pointsBalance: request.pointsOffered } }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Demande de permutation acceptée avec succès.',
            data: request
        });
    } catch (error) {
        console.log('Erreur lors de l\'acceptation de la permutation:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de l\'acceptation de la demande.'
        });
    }
};

/**
 * Rejette une demande
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.rejectRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user.id;

        // Récupération de la demande
        const request = await Request.findById(requestId)
            .populate('shiftRequested')
            .populate('shiftOffered');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Demande non trouvée.'
            });
        }

        // Vérification que la demande est en attente
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cette demande est déjà ${request.status}.`
            });
        }

        // Vérification des droits (propriétaire de la vacation demandée)
        let hasPermission = false;

        if (request.type === 'replacement' || request.type === 'flexibleSwap') {
            // N'importe quel utilisateur peut refuser une demande de remplacement
            hasPermission = true;
        } else if (request.type === 'swap') {
            // Pour une permutation, seul le propriétaire de la vacation demandée peut refuser
            hasPermission = request.shiftRequested?.user.toString() === userId;
        }

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Vous n\'avez pas les droits pour rejeter cette demande.'
            });
        }

        // Mise à jour de la demande
        request.status = 'rejected';
        await request.save();

        // Libération des vacations si nécessaire
        if (request.shiftOffered) {
            request.shiftOffered.isAvailable = false;
            await request.shiftOffered.save();
        }

        res.status(200).json({
            success: true,
            message: 'Demande rejetée avec succès.',
            data: request
        });
    } catch (error) {
        console.log('Erreur lors du rejet de la demande:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors du rejet de la demande.'
        });
    }
};

/**
 * Annule une demande (par l'initiateur)
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.cancelRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user.id;

        // Récupération de la demande
        const request = await Request.findById(requestId)
            .populate('shiftRequested')
            .populate('shiftOffered');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Demande non trouvée.'
            });
        }

        // Vérification que la demande est en attente
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cette demande est déjà ${request.status}.`
            });
        }

        // Vérification que l'utilisateur est bien l'initiateur
        if (request.requester.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Vous pouvez annuler uniquement vos propres demandes.'
            });
        }

        // Mise à jour de la demande
        request.status = 'cancelled';
        await request.save();

        // Libération des vacations
        if (request.shiftOffered) {
            request.shiftOffered.isAvailable = false;
            await request.shiftOffered.save();
        }

        res.status(200).json({
            success: true,
            message: 'Demande annulée avec succès.',
            data: request
        });
    } catch (error) {
        console.log('Erreur lors de l\'annulation de la demande:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de l\'annulation de la demande.'
        });
    }
};

/**
 * Récupère la liste des demandes avec pagination et filtres
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.getRequests = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            type,
            status,
            center,
            team,
            startDate,
            endDate
        } = req.query;

        const userId = req.user.id;
        const userRole = req.user.role;
        const userCenter = req.user.center;

        // Construction des filtres
        const filter = {};

        // Filtrage par type
        if (type) {
            filter.type = type;
        }

        // Filtrage par statut
        if (status) {
            filter.status = status;
        }

        // Filtrage par date
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        // Pour les utilisateurs normaux, ne montrer que leurs demandes ou les demandes qui les concernent
        if (userRole === 'user') {
            filter.$or = [
                { requester: userId },
                { acceptor: userId }
            ];
        }
        // Pour les admins locaux, limiter aux demandes de leur centre
        else if (userRole === 'localAdmin') {
            // On doit joindre les utilisateurs pour filtrer par centre
            // Cette logique sera appliquée dans l'agrégation
        }

        // Comptage total pour la pagination
        const total = await Request.countDocuments(filter);

        // Récupération des demandes avec pagination et filtres
        let requests;

        if (userRole === 'localAdmin') {
            // Pour les admins locaux, on doit filtrer par centre
            requests = await Request.aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'requester',
                        foreignField: '_id',
                        as: 'requesterInfo'
                    }
                },
                {
                    $match: {
                        $and: [
                            filter,
                            { 'requesterInfo.center': userCenter }
                        ]
                    }
                },
                {
                    $skip: (page - 1) * limit
                },
                {
                    $limit: parseInt(limit)
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'acceptor',
                        foreignField: '_id',
                        as: 'acceptorInfo'
                    }
                },
                {
                    $lookup: {
                        from: 'shifts',
                        localField: 'shiftRequested',
                        foreignField: '_id',
                        as: 'shiftRequestedInfo'
                    }
                },
                {
                    $lookup: {
                        from: 'shifts',
                        localField: 'shiftOffered',
                        foreignField: '_id',
                        as: 'shiftOfferedInfo'
                    }
                }
            ]);
        } else {
            // Pour les utilisateurs normaux et master admin
            requests = await Request.find(filter)
                .populate('requester', 'firstName lastName username center team')
                .populate('acceptor', 'firstName lastName username center team')
                .populate('shiftRequested')
                .populate('shiftOffered')
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ createdAt: -1 });
        }

        res.status(200).json({
            success: true,
            count: requests.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: requests
        });
    } catch (error) {
        console.log('Erreur lors de la récupération des demandes:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des demandes.'
        });
    }
};

/**
 * Récupère les détails d'une demande
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.getRequestById = async (req, res) => {
    try {
        const { requestId } = req.params;

        const request = await Request.findById(requestId)
            .populate('requester', 'firstName lastName username center team pointsBalance')
            .populate('acceptor', 'firstName lastName username center team pointsBalance')
            .populate({
                path: 'shiftRequested',
                populate: { path: 'roster', select: 'name center' }
            })
            .populate({
                path: 'shiftOffered',
                populate: { path: 'roster', select: 'name center' }
            });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Demande non trouvée.'
            });
        }

        // Vérification des droits d'accès
        const userId = req.user.id;
        const userRole = req.user.role;
        const userCenter = req.user.center;

        let hasAccess = false;

        // Les admins ont toujours accès
        if (userRole === 'masterAdmin') {
            hasAccess = true;
        }
        // Les admins locaux ont accès aux demandes de leur centre
        else if (userRole === 'localAdmin' && request.requester.center === userCenter) {
            hasAccess = true;
        }
        // Les utilisateurs ont accès à leurs propres demandes ou celles qui les concernent
        else if (
            request.requester._id.toString() === userId ||
            (request.acceptor && request.acceptor._id.toString() === userId)
        ) {
            hasAccess = true;
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Vous n\'avez pas les droits pour accéder à cette demande.'
            });
        }

        res.status(200).json({
            success: true,
            data: request
        });
    } catch (error) {
        console.log('Erreur lors de la récupération des détails de la demande:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des détails de la demande.'
        });
    }
};