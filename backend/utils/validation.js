import { Temporal } from '@js-temporal/polyfill';
import { toPlainDate } from './dates/plainDate.js';

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
