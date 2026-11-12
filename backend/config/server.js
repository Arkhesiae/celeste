/**
 * Démarrage du serveur.
 */

/** Port d'écoute si PORT n'est pas défini */
export const DEFAULT_PORT = 3000;

/** Connexion à MongoDB au démarrage : nombre de tentatives et délai entre deux */
export const MONGO_MAX_RETRIES = 5;
export const MONGO_RETRY_DELAY_MS = 5_000;
