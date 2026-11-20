import Substitution from '../models/Substitution.js';
import User from '../models/User.js';
import Rule from '../models/Rule.js';
import { posterDayOf } from '../utils/dates/dayAccess.js';
import { formatDateFr } from '../utils/dates/format.js';
import { findOrThrow } from '../utils/mongo.js';
import { fullName } from '../utils/names.js';
import { sameId } from '../utils/ids.js';
import { assertDay, assertId, assertObject, isValidDate, isValidDateRange } from '../utils/validation.js';
import { AppError } from '../error/AppError.js';
import * as planningService from '../services/planning/index.js';
import * as substitutionService from '../services/substitution/index.js';
import * as emailService from '../services/email/index.js';

const getCenterRequests = async (req, res, next) => {
    const { userId } = req.user;
    const { startDate, endDate } = req.body;

    try {
        if (!startDate || !endDate) {
            throw new AppError('Les dates sont requises', 400);
        }

        if (!isValidDateRange({ startDate, endDate })) {
            throw new AppError('Les dates sont invalides', 400);
        }

        const requests = await substitutionService.getRequests(userId, startDate, endDate);
        res.status(200).json(requests);
    } catch (err) {
        next(err);
    }
};

// Charge de demandes par jour (ouvertes / acceptées) : comptes seulement, pour la carte de chaleur du tableau de bord
const getDemandHeatmap = async (req, res, next) => {
    try {
        const { centerId } = req.params;
        const { startDate, endDate } = req.query;
        res.status(200).json(await substitutionService.getDemandHeatmap(centerId, startDate, endDate));
    } catch (err) {
        next(err);
    }
};

// Demandes postées par un utilisateur : lui-même ou l'administrateur de son centre (garde de la route)
const getUserDemands = async (req, res, next) => {
    try {
        const userId = assertId(req.params.userId, 'ID utilisateur');
        await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
        res.status(200).json(await Substitution.find({ posterId: userId }));
    } catch (err) {
        next(err);
    }
};

const getAllCenterDemands = async (req, res, next) => {
    const { centerId } = req.params;

    try {
        if (!centerId) {
            throw new AppError('L\'identifiant du centre est requis', 400);
        }


        const demands = await Substitution.find({ centerId, deleted: false })
            .populate('posterId', 'name lastName email avatar personalData')
            .populate('accepterId', 'name lastName email avatar personalData')
            .populate('posterShift.shift')
            .populate('accepterShift.shift')
            .sort({ createdAt: -1 });

        res.status(200).json(demands);
    } catch (err) {
        next(err);
    }
};

const consultDemand = async (req, res, next) => {
    const { id: demandId } = req.params;
    const { userId } = req.user;

    try {
        if (!demandId) {
            throw new AppError('L\'identifiant de la demande est requis', 400);
        }

        const demand = await substitutionService.consultDemand(demandId, userId);
        res.status(200).json({ message: 'Demande consultée avec succès', demand });
    } catch (err) {
        next(err);
    }
};

const getCompatibility = async (req, res, next) => {
    const { id: demandId } = req.params;
    const { userId } = req.user;
    try {
        if (!demandId) {
            throw new AppError('L\'identifiant de la demande est requis', 400);
        }
        const data = await substitutionService.getCompatibility(demandId, userId);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const getDemand = async (req, res, next) => {
  try {
    res.status(200).json(await substitutionService.getRequestById(req.params.id));
  } catch (err) {
    next(err);
  }
};

const getAvailableUsers = async (req, res, next) => {
    const { id: demandId } = req.params;

    try {
        if (!demandId) {
            throw new AppError('L\'identifiant de la demande est requis', 400);
        }
        const demand = await findOrThrow(Substitution, demandId, { message: 'Demande non trouvée' });
        if (demand.status !== 'open') {
            throw new AppError('Cette demande n\'est plus disponible', 400);
        }

        const userPool = await substitutionService.computeUserPool(demand);
        res.status(200).json({ userPool, totalUsers: userPool.length });
    } catch (err) {
        //console.error('Erreur lors du calcul du pool d\'utilisateurs:', err);
        next(err);
    }
};

const checkUserShift = async (req, res, next) => {
    const { date } = req.params;
    const { userId } = req.user;

    try {
        if (!date) {
            throw new AppError('La date est requise', 400);
        }

        const userShift = await planningService.computeUserShifts(new Date(date), userId);
        const entry = userShift[0];
        // computeUserShifts : `shiftData.shift` est la vacation tenue (vide si remplacé), `presence` dit s'il y est (dispo, jour
        // facultatif non confirmé : non)
        const shiftType = entry?.shiftData?.shift?.type;
        const hasShift = Boolean(entry && entry.presence === 'present' && shiftType === 'work');
        res.status(200).json({ hasShift, shift: userShift });
    } catch (err) {
        next(err);
    }
};

// ─── Mutations ────────────────────────────────────────────────────────────────

const createDemand = async (req, res, next) => {
    try {
        const { posterShift, comment, points = 0, acceptedSwitches = [], isTrueSwitch } = req.body;

        assertObject(posterShift, 'Vacation');
        assertDay(posterShift.date, 'Date de la vacation');

        const demand = await substitutionService.createDemand({
            posterId: req.user.userId,
            posterShift: { date: posterShift.date, selectedVariation: posterShift.selectedVariation },
            comment,
            points,
            acceptedSwitches,
            isTrueSwitch,
        });
        res.status(201).json(demand);

        // Notifications en arrière-plan, après la réponse
        const populatedDemand = await demand.populate([
            { path: 'posterId', select: 'name lastName' },
            { path: 'posterShift.teamId', select: 'name' },
            { path: 'acceptedSwitches.shift', select: 'name default' },
        ]);

        const userPool = await substitutionService.computeUserPool(populatedDemand);
        if (userPool.length > 0) {
            emailService.sendUserPoolNotification(userPool, populatedDemand)
                .then(results => console.log(`📧 Notifications envoyées:`, results))
                .catch(error => console.error('❌ Erreur notifications:', error));
        }
    } catch (err) {
        next(err);
    }
};

// Mutations

const acceptDemand = async (req, res, next) => {
    const { id: demandId } = req.params;
    const { userId } = req.user;
    try {
        if (!demandId) {
            throw new AppError('Paramètres manquants', 400);
        }

        const { request, shift } = await substitutionService.acceptDemand(demandId, userId);
        res.status(200).json({ message: 'Demande acceptée', request, newShiftData: shift });
    } catch (err) {
        next(err);
    }
};

const swapShifts = async (req, res, next) => {
    const { id: demandId } = req.params;
    const { userId } = req.user;

    try {
        if (!demandId) {
            throw new AppError('Paramètres manquants', 400);
        }

        const { demand, acceptedShiftPoints, shift } = await substitutionService.swapShifts(demandId, userId);
        res.status(200).json({
            message: 'Switch enregistré',
            demand,
            acceptedShiftPoints,
            newShiftData: shift
        });
    } catch (err) {
        next(err);
    }
};

const withdrawFromDemand = async (req, res, next) => {
    const { id: demandId } = req.params;
    const { userId } = req.user;
    if (!demandId) {
        throw new AppError('Paramètres manquants', 400);
    }

    try {
        const result = await substitutionService.withdrawFromRequest(demandId, userId);
        res.status(200).json({ message: 'Désistement enregistré', request: result.updatedRequest, newShiftData: result.shift });
    } catch (err) {
        next(err);
    }
};


const cancelDemand = async (req, res, next) => {
    const { id: demandId } = req.params;
    try {
        if (!demandId) {
            throw new AppError('Paramètres manquants', 400);
        }
        const result = await substitutionService.cancelRequest(demandId, { actorId: req.user.userId });
        res.status(200).json({ message: 'Demande annulée avec succès', demand: result.initialCancel, shift: result.shift });
    } catch (err) {
        next(err);
    }
};

const markInterest = async (req, res, next) => {
    try {
        const { id: demandId } = req.params;
        const { userId } = req.user;

        const demand = await findOrThrow(Substitution, demandId, { message: 'Demande non trouvée' });
        const alreadyInterested = demand.interested.includes(userId);
        if (alreadyInterested) {
            demand.interested = demand.interested.filter(id => !sameId(id, userId));
        } else {
            demand.interested.push(userId);
        }

        await demand.save();
        res.status(200).json({
            message: alreadyInterested ? 'Intérêt retiré' : 'Intérêt ajouté',
            demand
        });
    } catch (err) {
        next(err);
    }
};


// Recatégoriser les substitutions
const recategorizeSubstitutions = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { substitutionIds } = req.body;
        const categorizedSubstitutions = await substitutionService.recategorizeSubstitutions(substitutionIds, userId);
        res.status(200).json({ message: 'Substitutions recatégorisées avec succès', categorizedSubstitutions });
    } catch (err) {
        next(err);
    }
};

const getCompatibleSwitches = async (req, res, next) => {
    try {
        const date = req.params.date;
        const userId = req.user.userId;
        // Le service raisonne en jours `YYYY-MM-DD` et ne convertit rien : le format se contrôle ici
        if (!isValidDate(date)) {
            throw new AppError('Date invalide (AAAA-MM-JJ attendu)', 400);
        }
        const compatibleShifts = await substitutionService.getCompatibleSwitches(date, userId);
        res.status(200).json(compatibleShifts);
    } catch (err) {
        next(err);
    }
};


const sendAdminEmail = async (req, res, next) => {
    const { id: demandId } = req.params;
    try {
        if (!demandId) {
            throw new AppError('Identifiant de la demande requis', 400);
        }

        const demand = await findOrThrow(Substitution, demandId, { message: 'Demande non trouvée' });
        const rule = await Rule.findOne({ name: 'Mailing administration' });
        if (!rule) {
            throw new AppError('Règle de mailing non configurée', 404);
        }

        const centerId = demand.centerId;
        const ruleValue = rule.getValueForCenter(centerId);

        if (!ruleValue || !ruleValue.enabled) {
            throw new AppError('Le mailing automatique n\'est pas activé pour ce centre', 400);
        }

        const emails = ruleValue.emails || [];
        if (emails.length === 0) {
            throw new AppError('Aucune adresse e-mail configurée pour le mailing de ce centre', 400);
        }

        const populatedDemand = await Substitution.findById(demandId)
            .populate('posterId', 'name lastName email')
            .populate('posterShift.shift')
            .populate('posterShift.teamId');

        const posterName = fullName(populatedDemand.posterId) || 'Un utilisateur';

        const shiftName = populatedDemand.posterShift?.shift?.name || 'Vacation';
        const teamName = populatedDemand.posterShift?.teamId?.name || 'Équipe';
        const dateStr = formatDateFr(posterDayOf(populatedDemand), { short: true });

        const typeStr = populatedDemand.type === 'switch' ? 'Permutation' : populatedDemand.type === 'substitution' ? 'Remplacement' : 'Remplacement ou permutation';

        const mailSubject = `[Céleste] Demande de ${typeStr} - ${posterName}`;
        const mailContent = `
            <h3>Nouvelle demande de changement de planning</h3>
            <p>Bonjour,</p>
            <p>Une nouvelle demande a été publiée sur Céleste :</p>
            <ul>
                <li><strong>Utilisateur :</strong> ${posterName}</li>
                <li><strong>Type de demande :</strong> ${typeStr}</li>
                <li><strong>Date de vacation :</strong> ${dateStr}</li>
                <li><strong>Vacation :</strong> ${shiftName} (${teamName})</li>
                <li><strong>Points :</strong> ${populatedDemand.points}</li>
            </ul>
            <p>Ce mail est généré automatiquement par le système Céleste.</p>
        `;

        const result = await emailService.sendEmail({
            to: emails,
            subject: mailSubject,
            html: mailContent
        });

        if (result && result.sent) {
            demand.mailStatus = 'sent';
            await demand.save();
            res.status(200).json({ message: 'E-mail envoyé aux administrateurs', demand });
        } else {
            throw new AppError(`Échec de l'envoi de l'e-mail: ${result?.error || 'Erreur inconnue'}`, 500);
        }
    } catch (err) {
        next(err);
    }
};

export {
    getCenterRequests,
    getUserDemands,
    getDemand,
    getAllCenterDemands,
    getDemandHeatmap,
    consultDemand,
    getCompatibility,
    getAvailableUsers,
    checkUserShift,
    createDemand,
    cancelDemand,
    acceptDemand,
    withdrawFromDemand,
    markInterest,
    swapShifts,
    recategorizeSubstitutions,
    getCompatibleSwitches,
    sendAdminEmail,
};