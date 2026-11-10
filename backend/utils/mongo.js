import mongoose from 'mongoose';
import { AppError } from '../error/AppError.js';

/**
 * Exécute `fn(session)` dans une transaction MongoDB et renvoie son résultat.
 *
 * - Sans `session` : ouvre une session, la transaction (rejouée par le pilote sur erreur transitoire) et la referme.
 * - Avec `session` : participe à la transaction de l'appelant, sans en ouvrir une autre.
 *
 * Le corps de `fn` peut donc être rejoué : il ne doit pas avoir d'effet de bord hors base (emails, etc.), qui se font
 * après le retour de `inTransaction`. Nécessite un replica set (voir known issue #21).
 *
 * @template T
 * @param {(session: import('mongoose').ClientSession) => Promise<T>} fn
 * @param {{ session?: import('mongoose').ClientSession }} [opts]
 * @returns {Promise<T>}
 */
export async function inTransaction (fn, { session } = {}) {
    if (session) return fn(session);

    const ownSession = await mongoose.startSession();
    try {
        return await ownSession.withTransaction(() => fn(ownSession));
    } finally {
        await ownSession.endSession();
    }
}

/**
 * Charge un document par id ou lève une AppError 404.
 *
 * @param {import('mongoose').Model} Model
 * @param {string|import('mongoose').Types.ObjectId} id
 * @param {Object} [opts]
 * @param {string} [opts.message] - message de l'erreur (défaut : « <Modèle> non trouvé »)
 * @param {number} [opts.status=404]
 * @param {string} [opts.code] - code applicatif de l'erreur
 * @param {string|Object} [opts.select]
 * @param {string|Object|Array} [opts.populate]
 * @param {boolean} [opts.lean]
 * @param {import('mongoose').ClientSession} [opts.session]
 */
export async function findOrThrow (Model, id, { message, status = 404, code, select, populate, lean = false, session } = {}) {
    let query = Model.findById(id);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    if (session) query = query.session(session);
    if (lean) query = query.lean();

    const doc = await query;
    if (!doc) throw new AppError(message ?? `${Model.modelName} non trouvé`, status, code);
    return doc;
}
