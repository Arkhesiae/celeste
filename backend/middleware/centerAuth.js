import User from '../models/User.js';
import { isValidId, sameId } from '../utils/ids.js';
import Substitution from '../models/Substitution.js';
import Team from '../models/Team.js';
import Ticket from '../models/Ticket.js';
import Rotation from '../models/Rotation.js';
import PublicAnnouncement from '../models/PublicAnnouncement.js';
import { AppError } from '../error/AppError.js';

/**
 * Cloisonnement par centre (à placer après verifyToken).
 *
 * Règle commune : un administrateur master accède à tous les centres ; tous les autres uniquement à leur propre
 * centre. Fail-closed : un appelant sans centre, ou une ressource sans centre, est refusé (sauf master).
 * Le rôle et le centre de l'appelant sont lus dans le jeton d'accès, à un seul endroit : `loadCaller`.
 * `req.user.centerId` (issu du jeton) est disponible pour la suite de la chaîne (certains contrôleurs en dépendent).
 *
 * Choisir la garde selon ce que la route désigne. Le centre visé se met dans l'URL (`/center/:centerId/...`), pas dans
 * le corps : la règle d'accès se lit alors dans la route.
 *   un centre dans l'URL ....... authorizeCenterParam('centerId')
 *   une ressource par son id ... authorizeResourceCenter(Model, opts) — ou ses instances nommées :
 *                                authorizeDemandAccess, authorizeTeamAccess, authorizeTicketAccess,
 *                                authorizeRotationAccess, authorizeAnnouncementAccess
 *   plusieurs ressources (corps)  authorizeBodyResourcesCenter(Model, opts)
 *   un utilisateur par son id .. authorizeTargetUserCenter (soi ou un collègue) / authorizeSelfOrCenterAdmin
 *   seulement le centre de l'appelant (listes) ... resolveCenterId
 */

const FORBIDDEN = 'Accès refusé. Cette ressource appartient à un autre centre.';

// Le rôle et le centre viennent du jeton d'accès (courte durée de vie, renouvelé via le refresh token).
const loadCaller = async (req) => ({
    centerId: req.user.centerId,
    adminType: req.user.adminType,
    isAdmin: req.user.isAdmin
});

const isMaster = (caller) => caller.adminType === 'master';
const sameCenter = sameId;   // un centre se compare comme n'importe quel id

/** Enveloppe une vérification asynchrone en middleware : elle lève une AppError pour refuser. */
const guard = (check) => async (req, res, next) => {
    try {
        const caller = await loadCaller(req);
        await check(req, caller);
        req.user.centerId = caller.centerId;
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Aucun contrôle : charge seulement le centre de l'appelant dans `req.user.centerId`, pour les routes qui filtrent
 * leur liste sur le centre de l'appelant (le contrôleur traite le master à part).
 */
export const resolveCenterId = guard(() => {});

/** La route cible un centre (`req.params[param]`) : l'appelant doit en faire partie. */
export const authorizeCenterParam = (param = 'centerId') => guard((req, caller) => {
    const centerId = req.params[param];
    if (!isValidId(centerId)) throw new AppError('ID de centre invalide.', 400);
    if (!isMaster(caller) && !sameCenter(caller.centerId, centerId)) throw new AppError(FORBIDDEN, 403);
});

/**
 * La route cible une ressource par son id (`req.params[param]`) : elle doit appartenir au centre de l'appelant.
 * @param {Model} Model
 * @param {Object} [opts]
 * @param {string} [opts.param='id']
 * @param {string} [opts.centerField='centerId'] - champ qui porte le centre dans le modèle (ex. `center` pour Team)
 * @param {string} [opts.masterOnlyField] - champ booléen qui réserve la ressource au master quand il est vrai
 *   (ex. `isGlobal` : une annonce globale n'est modifiable que par le master, même si elle porte un centre)
 */
export const authorizeResourceCenter = (Model, { param = 'id', centerField = 'centerId', masterOnlyField = null } = {}) => guard(async (req, caller) => {
    const id = req.params[param];
    if (!isValidId(id)) throw new AppError('Identifiant invalide.', 400);
    if (isMaster(caller)) return;                                    // le contrôleur répondra 404 si elle n'existe pas

    const resource = await Model.findById(id).select(masterOnlyField ? `${centerField} ${masterOnlyField}` : centerField).lean();
    if (!resource) throw new AppError('Ressource non trouvée.', 404);
    if (masterOnlyField && resource[masterOnlyField]) throw new AppError(FORBIDDEN, 403);
    if (!sameCenter(caller.centerId, resource[centerField])) throw new AppError(FORBIDDEN, 403);
});

/**
 * La route reçoit une liste d'ids dans le corps (`req.body[bodyField]`) : toutes les ressources doivent exister et
 * appartenir au centre de l'appelant (ex. réordonner des équipes).
 */
export const authorizeBodyResourcesCenter = (Model, { bodyField = 'ids', centerField = 'centerId', max = 200 } = {}) => guard(async (req, caller) => {
    const ids = req.body?.[bodyField];
    if (!Array.isArray(ids) || ids.length > max || !ids.every(isValidId)) throw new AppError("Liste d'identifiants invalide.", 400);
    if (isMaster(caller) || ids.length === 0) return;

    const resources = await Model.find({ _id: { $in: ids } }).select(centerField).lean();
    if (resources.length !== new Set(ids.map(String)).size) throw new AppError('Ressource non trouvée.', 404);
    if (!resources.every((r) => sameCenter(caller.centerId, r[centerField]))) throw new AppError(FORBIDDEN, 403);
});

/**
 * La route cible un utilisateur (`req.params[param]`). Selon `mode` :
 *   'member'        soi-même ou un utilisateur du même centre (données visibles entre collègues)
 *   'self-or-admin' soi-même, ou l'administrateur du centre de l'utilisateur (remplace l'ancien isUserOrAdmin, qui
 *                   laissait n'importe quel administrateur agir sur n'importe quel utilisateur). Pour une route
 *                   réservée aux administrateurs, mettre `isAdmin` devant : « soi-même » n'est alors qu'un administrateur.
 * (Fail-closed : l'ancien checkUserCenter laissait passer quand le paramètre était absent.)
 */
const authorizeUserAccess = (param, mode) => guard(async (req, caller) => {
    const targetId = req.params[param];
    if (!isValidId(targetId)) throw new AppError('ID utilisateur invalide.', 400);

    if (isMaster(caller) || sameId(req.user.userId, targetId)) return;
    if (mode === 'self-or-admin' && !caller.isAdmin) throw new AppError("Accès refusé. Droits d'administrateur requis.", 403);

    const target = await User.findById(targetId).select('centerId').lean();
    if (!target) throw new AppError('Utilisateur non trouvé.', 404);
    if (!sameCenter(caller.centerId, target.centerId)) throw new AppError('Accès refusé. Cet utilisateur appartient à un autre centre.', 403);
});

export const authorizeTargetUserCenter = (param = 'id') => authorizeUserAccess(param, 'member');
export const authorizeSelfOrCenterAdmin = (param = 'id') => authorizeUserAccess(param, 'self-or-admin');

// ── Instances nommées pour les routes ────────────────────────────────────────

/** Demande de remplacement / permutation (`Substitution.centerId`). */
export const authorizeDemandAccess = authorizeResourceCenter(Substitution);

/** Équipe (`Team.center`). */
export const authorizeTeamAccess = authorizeResourceCenter(Team, { centerField: 'center' });

/** Ticket (`Ticket.centerId`) : un ticket sans centre (adressé à l'administrateur principal) est réservé au master. */
export const authorizeTicketAccess = authorizeResourceCenter(Ticket);

/** Tour de service (`Rotation.centerId`). */
export const authorizeRotationAccess = authorizeResourceCenter(Rotation);

/** Annonce publique (`PublicAnnouncement.centerId`) : une annonce globale n'est modifiable que par le master. */
export const authorizeAnnouncementAccess = authorizeResourceCenter(PublicAnnouncement, { masterOnlyField: 'isGlobal' });
