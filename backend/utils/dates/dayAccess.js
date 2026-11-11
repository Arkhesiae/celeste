// TEMPORARY(day-fields): tout ce fichier disparait a la bascule (les lecteurs liront le jumeau directement, les ecritures n'auront plus qu'un champ).
import { Temporal } from '@js-temporal/polyfill';
import { toDay } from './dayFields.js';
import { toMongoDate } from './plainDate.js';

/**
 * Lecture et écriture « double » des jours stockés, pendant la migration `Date` -> chaîne `YYYY-MM-DD`.
 *
 *   écriture : on écrit l'ancien champ ET son jumeau (`withDay`, `occurrenceDays`, `toDay` selon le cas) ;
 *   lecture  : on lit le jumeau ; s'il manque (ou s'il est incohérent avec l'ancien champ), on se rabat sur l'ancien
 *              champ ET on le signale dans la console (`reportMissingDay`) : les données ne sont pas migrées, ou une
 *              écriture oublie le jumeau. Remède : `node scripts/migrateDayFields.js --apply --confirm=<base>`.
 *   requêtes : `dayFilter` interroge le jumeau, et l'ancien champ pour les documents qui n'ont pas encore de jumeau.
 *
 * Quand la migration est terminée, ce fichier disparaît : les lecteurs lisent directement le champ-jour.
 */

// ── signalement ─────────────────────────────────────────────────────────────────────────────────────────────────
const REPORT_EVERY_MS = 60 * 1000;
const lastReport = new Map();   // libellé -> { at, suppressed }

/** console.error, au plus une fois par minute et par libellé (avec le nombre de signalements retenus entre-temps) */
export const reportMissingDay = (label, detail = '') => {
    const now = Date.now();
    const state = lastReport.get(label) ?? { at: 0, suppressed: 0 };
    if (now - state.at < REPORT_EVERY_MS) {
        state.suppressed++;
        lastReport.set(label, state);
        return;
    }
    const extra = state.suppressed ? ` (+${state.suppressed} autre(s) depuis le dernier signalement)` : '';
    console.error(`[jours] ${label} : jumeau « jour » absent ou incohérent, repli sur l'ancien champ Date${detail ? ` - ${detail}` : ''}${extra}. `
        + 'Lancer scripts/migrateDayFields.js (--check pour voir les écarts).');
    lastReport.set(label, { at: now, suppressed: 0 });
};

// ── lecture ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** Jour d'un champ : le jumeau s'il existe, sinon l'ancien champ (signalé) ; null si ni l'un ni l'autre */
export const dayOf = (twin, legacy, label) => {
    if (twin) return twin;
    if (legacy == null) return null;
    reportMissingDay(label);
    return toDay(legacy);
};

/** Jours d'activation d'une rotation (YYYY-MM-DD, ordre conservé). Le jumeau doit avoir autant d'éléments que l'ancien tableau. */
export const activationDaysOf = (rotation) => {
    const days = rotation?.activationDays;
    const dates = rotation?.activationDates;
    const hasDates = Array.isArray(dates) && dates.length > 0;

    if (Array.isArray(days) && days.length > 0 && (!hasDates || days.length === dates.length)) return [...days];
    if (hasDates) {
        reportMissingDay('Rotation.activationDays', `rotation ${rotation._id ?? ''}`.trim());
        return dates.map(toDay);
    }
    return [];
};

/** Jour d'un `posterShift` / `accepterShift` (sous-document avec `day` et `date`) */
export const shiftDayOf = (shift, label = 'Substitution.shift.day') => dayOf(shift?.day, shift?.date, label);
export const posterDayOf = (substitution) => shiftDayOf(substitution?.posterShift, 'Substitution.posterShift.day');
export const accepterDayOf = (substitution) => shiftDayOf(substitution?.accepterShift, 'Substitution.accepterShift.day');

/**
 * Bornes d'une occurrence d'équipe (`User.teams[]`) : { from, to }, `to` nul = équipe permanente.
 * Un `toDay` nul avec un `toDate` renseigné est un jumeau manquant (le schéma donne `null` par défaut) : repli signalé.
 */
export const occurrenceDays = (occurrence) => ({
    from: dayOf(occurrence?.fromDay, occurrence?.fromDate, 'User.teams[].fromDay'),
    to: occurrence?.toDay ?? dayOf(null, occurrence?.toDate, 'User.teams[].toDay'),
});

export const birthDayOf = (user) => dayOf(user?.personalData?.birthDay, user?.personalData?.birthDate, 'User.personalData.birthDay');
export const anchorDayOf = (center) => dayOf(center?.cycleAnchorDay, center?.cycleAnchorDate, 'Center.cycleAnchorDay');

// ── écriture ────────────────────────────────────────────────────────────────────────────────────────────────────
/** `{ date, day }` à partir d'une date : pour les sous-documents et objets qui portent les deux champs côte à côte */
export const withDay = (date) => ({ date, day: toDay(date) });

// ── requêtes ────────────────────────────────────────────────────────────────────────────────────────────────────
const midnight = (day) => toMongoDate(Temporal.PlainDate.from(day));

/**
 * Condition Mongo sur un champ-jour scalaire, avec repli sur l'ancien champ pour les documents sans jumeau.
 * `bounds` en jours YYYY-MM-DD : { eq } | { gte, gt, lte, lt } (les bornes absentes sont ignorées).
 * Les anciennes dates sont à minuit UTC : comparer avec `minuit(jour)` revient à comparer les jours.
 * Le résultat est un fragment : à placer dans `$and` quand le filtre a déjà son propre `$or`.
 */
export const dayFilter = (dayPath, datePath, bounds) => {
    const dayCond = {};
    const dateCond = {};
    for (const [op, day] of Object.entries(bounds)) {
        if (day == null) continue;
        dayCond[`$${op}`] = day;
        dateCond[`$${op}`] = midnight(day);
    }
    return { $or: [{ [dayPath]: dayCond }, { [dayPath]: { $exists: false }, [datePath]: dateCond }] };
};

/**
 * Condition « le tableau de jours contient ce jour » : le jumeau OU l'ancien tableau (les deux sont consultés : tant que
 * l'ancien champ est la source de vérité, un jumeau incomplet ne doit pas faire manquer une activation existante).
 */
export const dayInArrayFilter = (dayPath, datePath, day) => ({ $or: [{ [dayPath]: day }, { [datePath]: midnight(day) }] });
