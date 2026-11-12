import { Temporal } from '@js-temporal/polyfill';
import { toPlainDate } from './dates/plainDate.js';
import { isValidId } from './ids.js';
import { AppError } from '../error/AppError.js';

export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/** Jour calendaire réel au format YYYY-MM-DD (2026-02-30 est refusé, contrairement à une simple vérification de forme) */
export const isValidDate = (date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && toPlainDate(date) !== null;

/** Période valide : deux dates (YYYY-MM-DD ou ISO, seul le jour compte) avec début <= fin */
export const isValidDateRange = ({ startDate, endDate }) => {
    const start = toPlainDate(startDate);
    const end = toPlainDate(endDate);
    return !!start && !!end && Temporal.PlainDate.compare(start, end) <= 0;
}

/**
 * Contrôles d'entrée des contrôleurs : chacun renvoie la valeur si elle est valide, sinon lève une `AppError` 400.
 * Ils servent à refuser tôt une requête mal formée ; les règles métier restent dans les services.
 */

/** Identifiant MongoDB */
export const assertId = (value, label = 'Identifiant') => {
    if (!isValidId(value)) {
        throw new AppError(`${label} invalide`, 400);
    }
    return value;
};

/** Adresse e-mail */
export const assertEmail = (value) => {
    if (typeof value !== 'string' || !isValidEmail(value)) {
        throw new AppError('Adresse email invalide', 400);
    }
    return value;
};

/** Jour calendaire (YYYY-MM-DD, ou date ISO dont seul le jour compte) */
export const assertDay = (value, label = 'Date') => {
    if (typeof value !== 'string' || !toPlainDate(value)) {
        throw new AppError(`${label} invalide`, 400);
    }
    return value;
};

/** Entier strictement positif (accepte un nombre ou sa forme texte) */
export const assertPositiveInteger = (value, label = 'Valeur') => {
    const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    if (!Number.isInteger(number) || number <= 0) {
        throw new AppError(`${label} invalide`, 400);
    }
    return number;
};

/** Objet simple (ni tableau, ni null) */
export const assertObject = (value, label = 'Données') => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new AppError(`${label} invalides`, 400);
    }
    return value;
};
