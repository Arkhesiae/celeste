import { AppError } from '../error/AppError.js';

const GENERIC_MESSAGE = 'Erreur interne du serveur';

/**
 * Unique point de sortie des erreurs.
 *  - AppError : voulue, message et statut destinés au client.
 *  - Erreurs HTTP du framework (JSON invalide, corps trop gros...) : `expose` true, statut 4xx → transmises.
 *  - MulterError (taille, champ inattendu) : 400.
 *  - Tout le reste (bug, erreur Mongo/driver...) : 500 générique ; le détail n'est que journalisé.
 */
export function errorHandler (err, req, res, next) {
    if (res.headersSent) return next(err);

    let status = 500;
    let message = GENERIC_MESSAGE;
    let code;

    if (err instanceof AppError) {
        ({ status, message, code } = err);
    } else if (err?.expose === true && err.status >= 400 && err.status < 500) {
        ({ status, message } = err);
    } else if (err?.name === 'MulterError') {
        status = 400;
        message = err.message;
        code = err.code;
    }

    console.log(' ❌ Erreur : ', err?.message ?? message);

    if (status >= 500) {
        console.log(err);
        console.log('(Error 500)');
    }

    res.status(status).json({ error: message, message, code });
}
