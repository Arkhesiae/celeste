/**
 * Durées liées à l'authentification. Les secrets, eux, restent dans les variables d'environnement.
 */

/** Durée de vie du jeton d'accès, si ACCESS_TOKEN_EXPIRY n'est pas défini (format de `jsonwebtoken`) */
export const DEFAULT_ACCESS_TOKEN_EXPIRY = '15m';

/** Durée de vie du jeton de rafraîchissement (et du cookie qui le porte) */
export const REFRESH_TOKEN_DAYS = 180;
export const REFRESH_TOKEN_EXPIRY = `${REFRESH_TOKEN_DAYS}d`;
export const REFRESH_TOKEN_MAX_AGE_MS = REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000;

/** Durée de validité d'un code à usage unique (inscription, vérification d'e-mail) */
export const OTP_VALIDITY_MS = 10 * 60 * 1000;
