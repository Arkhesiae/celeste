/**
 * Règles légales de repos et de charge de travail, évaluées sur le planning d'un utilisateur dans lequel on a posé la
 * vacation cible : 11h de repos, 35h de repos continu et 48h de travail par période de 7 jours glissants, 5 jours de
 * travail consécutifs, et les trois règles du contrôle de nuit.
 *
 * Fonctions PURES : elles ne lisent ni la base ni l'environnement, seulement des vacations déjà converties en
 * Temporal.ZonedDateTime (`withZonedBounds`, voir utils/shifts/shiftTime.js). Le déroulé complet et la forme du résultat
 * sont décrits dans docs/architecture/demand-categorization.md ; l'assemblage pour une demande est dans
 * compatibility.categorize.js.
 */
import { Temporal } from '@js-temporal/polyfill';
import { isNightControl } from '../../../utils/shifts/nightControl.js';
import { withZonedBounds, wallClockIso } from '../../../utils/shifts/shiftTime.js';
import { DEFAULT_TIME_ZONE } from '../../../utils/dates/constants.js';
import {
    MIN_REST_MINUTES,
    WEEKLY_REST_MINUTES,
    MAX_WEEKLY_WORK_MINUTES,
    MAX_CONSECUTIVE_WORK_DAYS,
    MIN_REST_AFTER_NIGHT_MINUTES,
    MAX_CONSECUTIVE_NIGHT_CONTROLS,
    MIN_REST_AFTER_TWO_NIGHTS_MINUTES,
    WEEKLY_WINDOWS,
} from '../../../config/workRules.js';

const isLater = (a, b) => Temporal.ZonedDateTime.compare(a, b) > 0;
const isEarlier = (a, b) => Temporal.ZonedDateTime.compare(a, b) < 0;
/** Durée réelle entre deux instants, en minutes */
const minutesBetween = (earlier, later) => earlier.until(later, { largestUnit: 'minutes' }).total({ unit: 'minutes' });

/**
 * Position de la vacation cible dans un planning (clé du jour de début). La cible doit y figurer : c'est l'appelant qui
 * l'a posée à la place de ce que l'utilisateur faisait ce jour-là.
 */
function targetIndexOf (zonedShifts, targetDate) {
    const targetIndex = zonedShifts.findIndex(shift => shift.date === targetDate);
    if (targetIndex === -1) throw new Error(`La vacation cible du ${targetDate} est absente du planning`);
    return targetIndex;
}

/**
 * Évalue les règles légales pour la vacation cible d'un planning.
 *
 * `shiftsSorted` doit déjà CONTENIR la vacation cible à `targetDate` (elle remplace la vacation que l'utilisateur avait
 * ce jour-là). Les règles sont évaluées autour de cette date uniquement : un défaut ancien et lointain n'est pas imputé
 * à la cible.
 *
 *   code                       règle
 *   insufficientRest           moins de 11h de repos avant ou après la cible
 *   35limit                    une période de 7 jours glissants autour de la cible n'a aucun repos continu de 35h
 *   48hLimit                   plus de 48h de travail sur une période de 7 jours glissants autour de la cible
 *   consecutiveDaysLimit       plus de 5 jours de travail consécutifs (la série qui contient la cible)
 *   nightControlRestLimit      moins de 12h de repos après une vacation de contrôle de nuit (la cible ou la précédente)
 *   consecutiveNightLimit      plus de 2 contrôles de nuit consécutifs (la série qui contient la cible)
 *   restAfterTwoNightsLimit    moins de 48h de repos après deux contrôles de nuit consécutifs que la cible touche
 *
 * @param {string} targetDate - jour YYYY-MM-DD de la cible
 * @param {Array} shiftsSorted - vacations { shift, date, startTime, endTime, endsNextDay }, triées (shiftMapToArray)
 * @param {string} [timeZone] - fuseau du centre de l'utilisateur, le même pour TOUTES les vacations du planning
 * @returns {{ limit: string[], rest: { restBefore: number, restAfter: number }, invalidWindows35: Array, invalidWindows48: Array }}
 *   `limit` vide = compatible ; `rest` en minutes ; les fenêtres en défaut servent à l'affichage (graphique du front)
 */
function legalLimitsFor (targetDate, shiftsSorted, timeZone = DEFAULT_TIME_ZONE) {
    const zonedShifts = withZonedBounds(shiftsSorted, timeZone);
    const targetIndex = targetIndexOf(zonedShifts, targetDate);

    const restAroundTarget = checkMinimumRestTime(zonedShifts, targetIndex);
    const { restOk, invalidWindows35 } = checkWeeklyRestPeriod(zonedShifts, targetDate, true);
    const { workOk, invalidWindows48 } = checkWeeklyWorkHours(zonedShifts, targetDate, true);

    const limit = [];
    if (!restAroundTarget.ok) limit.push('insufficientRest');
    if (!restOk) limit.push('35limit');
    if (!workOk) limit.push('48hLimit');
    if (!checkConsecutiveWorkDays(zonedShifts, targetDate).ok) limit.push('consecutiveDaysLimit');
    if (!checkRestAfterNightControl(zonedShifts, targetDate).ok) limit.push('nightControlRestLimit');
    if (!checkConsecutiveNightControls(zonedShifts, targetDate).ok) limit.push('consecutiveNightLimit');
    if (!checkRestAfterTwoNightControls(zonedShifts, targetDate).ok) limit.push('restAfterTwoNightsLimit');

    return {
        limit,
        rest: { restBefore: restAroundTarget.restBefore, restAfter: restAroundTarget.restAfter },
        invalidWindows35,
        invalidWindows48,
    };
}

/**
 * Vérifie s'il y a au moins 11h de repos avant et après la vacation cible.
 * @param {Array} zonedShifts - vacations avec `start` / `end` (withZonedBounds), triées par début
 * @param {number} targetIndex - position de la vacation cible dans la liste
 * @returns {Object} { restBefore: number, restAfter: number, ok: boolean } (repos en minutes)
 */
function checkMinimumRestTime (zonedShifts, targetIndex) {
    const target = zonedShifts[targetIndex];
    if (target.shift.type !== 'work') return { restBefore: 0, restAfter: 0, ok: true };

    // La liste est triée par début : les voisins sont la vacation d'avant et celle d'après. Si elles se chevauchent
    // avec la cible, le repos est négatif donc refusé.
    const previousShift = zonedShifts[targetIndex - 1];
    const nextShift = zonedShifts[targetIndex + 1];

    const result = { restBefore: 0, restAfter: 0, ok: true };

    if (previousShift) {
        result.restBefore = minutesBetween(previousShift.end, target.start);
        if (result.restBefore < MIN_REST_MINUTES) result.ok = false;
    }

    if (nextShift) {
        result.restAfter = minutesBetween(target.end, nextShift.start);
        if (result.restAfter < MIN_REST_MINUTES) result.ok = false;
    }

    return result;
}

/**
 * Les 13 périodes de 7 jours glissants (minuit à minuit, en heure du centre) qui contiennent le jour cible : celles
 * qui commencent de J-6 (la cible est le dernier jour) à J+6 (la cible est le premier jour).
 *
 *   J-6 ........ J ........ J+6        début de chaque fenêtre ; chacune dure 7 jours : [début, début + 7 j[
 *
 * Les bornes sont des minuits LOCAUX du fuseau : une fenêtre qui contient un changement d'heure dure 167h ou 169h.
 *
 * @param {string} targetDate - jour cible YYYY-MM-DD
 * @param {string} timeZone - fuseau du centre
 * @returns {Array<{ start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime }>}
 */
function weeklyWindowsAround (targetDate, timeZone) {
    const targetDay = Temporal.PlainDate.from(targetDate);
    return Array.from({ length: WEEKLY_WINDOWS }, (_, windowIndex) => {
        const firstDay = targetDay.add({ days: windowIndex - 6 });
        return {
            start: firstDay.toZonedDateTime(timeZone),
            end: firstDay.add({ days: 7 }).toZonedDateTime(timeZone),
        };
    });
}

/**
 * La période de 7 jours qui commence au jour donné : de minuit à minuit (heure du centre), [début, début + 7 j[.
 * @param {string} startDay - premier jour YYYY-MM-DD
 * @param {string} timeZone - fuseau du centre
 * @returns {{ start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime }}
 */
function windowStartingOn (startDay, timeZone) {
    const firstDay = Temporal.PlainDate.from(startDay);
    return {
        start: firstDay.toZonedDateTime(timeZone),
        end: firstDay.add({ days: 7 }).toZonedDateTime(timeZone),
    };
}

/**
 * Le plus long repos continu d'une période (voir checkWeeklyRestPeriod pour le détail). On parcourt les vacations de la
 * période dans l'ordre en suivant `workedUntil`, la fin du travail déjà vu : l'écart entre `workedUntil` et le début de la
 * vacation suivante est un repos ; le dernier repos va jusqu'à la fin de la période.
 * @param {Array} zonedShifts - vacations avec `start` / `end` (withZonedBounds), triées par début
 * @param {{ start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime }} window
 * @returns {{ minutes: number, from: Temporal.ZonedDateTime|null, to: Temporal.ZonedDateTime|null }}
 */
function longestRestIn (zonedShifts, window) {
    let workedUntil = window.start;
    let longestRest = { minutes: 0, from: null, to: null };
    const considerRest = (restStart, restEnd) => {
        const minutes = minutesBetween(restStart, restEnd);
        if (minutes > longestRest.minutes) longestRest = { minutes, from: restStart, to: restEnd };
    };

    for (const shift of zonedShifts) {
        // Hors période : finit avant elle, ou commence à sa fin ou après (un service qui commence pile à la fin de la
        // période appartient à la période suivante)
        if (isEarlier(shift.end, window.start) || !isEarlier(shift.start, window.end)) continue;
        if (isLater(shift.start, workedUntil)) considerRest(workedUntil, shift.start);
        if (isLater(shift.end, workedUntil)) workedUntil = shift.end;
    }
    if (isEarlier(workedUntil, window.end)) considerRest(workedUntil, window.end);
    return longestRest;
}

/**
 * Minutes de travail d'une période : une vacation à cheval sur un bord n'y compte que pour la partie qui s'y trouve ; les
 * durées de vacations qui se chevauchent s'additionnent (voir #47).
 * @param {Array} zonedShifts - vacations avec `start` / `end` (withZonedBounds)
 * @param {{ start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime }} window
 */
function workMinutesIn (zonedShifts, window) {
    let totalWorkMinutes = 0;
    for (const shift of zonedShifts) {
        const workedFrom = isLater(shift.start, window.start) ? shift.start : window.start;
        const workedUntil = isEarlier(shift.end, window.end) ? shift.end : window.end;
        if (isLater(workedUntil, workedFrom)) totalWorkMinutes += minutesBetween(workedFrom, workedUntil);
    }
    return totalWorkMinutes;
}

/**
 * Règle des 35h : dans CHAQUE période de 7 jours glissants autour de la cible, il doit exister un repos continu d'au
 * moins 35h. On parcourt les vacations de la fenêtre dans l'ordre en suivant `workedUntil`, la fin du travail déjà
 * vu : l'écart entre `workedUntil` et le début de la vacation suivante est un repos ; le dernier repos va jusqu'à la
 * fin de la fenêtre. Une vacation qui chevauche le début de la fenêtre (nuit) repousse `workedUntil` : pas de repos
 * avant elle.
 *
 * Le repos est borné par la fenêtre (comportement voulu) : le repos de 35h doit tenir tout entier dans chaque période
 * de 7 jours. Un repos à cheval sur deux fenêtres est coupé ; une semaine 5/2 lundi-vendredi (64h de repos le week-end)
 * est donc refusée : les fenêtres commençant le dimanche n'en contiennent que 31h + 33h.
 *
 * @param {Array} zonedShifts - vacations avec `start` / `end` (withZonedBounds), triées par début
 * @param {string} targetDate - jour cible YYYY-MM-DD
 * @param {boolean} [fullScan=false] - false : s'arrête à la première fenêtre en défaut ; true : les liste toutes
 * @returns {{ restOk: boolean, invalidWindows35: Array }} fenêtres en défaut : { windowStart, windowEnd (texte lu par le
 *   front), longestRest (minutes), longestRestStart, longestRestEnd (texte ou null) }
 */
function checkWeeklyRestPeriod (zonedShifts, targetDate, fullScan = false) {
    const invalidWindows35 = [];
    const timeZone = zonedShifts[targetIndexOf(zonedShifts, targetDate)].start.timeZoneId;

    for (const window of weeklyWindowsAround(targetDate, timeZone)) {
        const longestRest = longestRestIn(zonedShifts, window);

        if (longestRest.minutes < WEEKLY_REST_MINUTES) {
            invalidWindows35.push({
                windowStart: wallClockIso(window.start),
                windowEnd: wallClockIso(window.end),
                longestRest: longestRest.minutes,
                longestRestStart: longestRest.from === null ? null : wallClockIso(longestRest.from),
                longestRestEnd: longestRest.to === null ? null : wallClockIso(longestRest.to),
            });
            if (!fullScan) break;
        }
    }
    return { restOk: invalidWindows35.length === 0, invalidWindows35 };
}

/**
 * Règle des 48h : dans CHAQUE période de 7 jours glissants autour de la cible, au plus 48h de travail. Une vacation
 * à cheval sur le bord d'une fenêtre n'y compte que pour la partie qui s'y trouve. Les durées de vacations qui se
 * chevauchent s'additionnent (elles ne sont pas fusionnées, voir #47).
 *
 * @param {Array} zonedShifts - vacations avec `start` / `end` (withZonedBounds)
 * @param {string} targetDate - jour cible YYYY-MM-DD
 * @param {boolean} [fullScan=false] - false : s'arrête à la première fenêtre en défaut ; true : les liste toutes
 * @returns {{ workOk: boolean, invalidWindows48: Array }} fenêtres en défaut : { windowStart, windowEnd (texte lu par
 *   le front), totalWorkMinutes }
 */
function checkWeeklyWorkHours (zonedShifts, targetDate, fullScan = false) {
    const invalidWindows48 = [];
    const timeZone = zonedShifts[targetIndexOf(zonedShifts, targetDate)].start.timeZoneId;

    for (const window of weeklyWindowsAround(targetDate, timeZone)) {
        const totalWorkMinutes = workMinutesIn(zonedShifts, window);

        if (totalWorkMinutes > MAX_WEEKLY_WORK_MINUTES) {
            invalidWindows48.push({
                windowStart: wallClockIso(window.start),
                windowEnd: wallClockIso(window.end),
                totalWorkMinutes,
            });
            if (!fullScan) break;
        }
    }
    return { workOk: invalidWindows48.length === 0, invalidWindows48 };
}

const isWork = (zonedShift) => zonedShift?.shift?.type === 'work';
const isNight = (zonedShift) => isWork(zonedShift) && isNightControl(zonedShift);
/** Repos (minutes) entre la fin d'une vacation et le début de la suivante */
const restMinutes = (previousShift, nextShift) => minutesBetween(previousShift.end, nextShift.start);

/**
 * Série de jours consécutifs, autour de la cible, dont les vacations satisfont `qualifies` (travail, ou contrôle de
 * nuit). Deux vacations sont « consécutives » si leurs jours de début se suivent : une nuit 22:00-06:00 compte pour le
 * jour où elle commence.
 * @returns {Array} les vacations de la série, dans l'ordre des jours ; vide si la cible ne qualifie pas
 */
function streakAround (zonedShifts, targetIndex, qualifies) {
    const target = zonedShifts[targetIndex];
    if (!qualifies(target)) return [];
    const qualifyingByDate = new Map(zonedShifts.filter(qualifies).map(shift => [shift.date, shift]));
    const streak = [target];
    const targetDay = Temporal.PlainDate.from(target.date);
    for (let day = targetDay.subtract({ days: 1 }); qualifyingByDate.has(day.toString()); day = day.subtract({ days: 1 })) streak.unshift(qualifyingByDate.get(day.toString()));
    for (let day = targetDay.add({ days: 1 }); qualifyingByDate.has(day.toString()); day = day.add({ days: 1 })) streak.push(qualifyingByDate.get(day.toString()));
    return streak;
}

/**
 * Vérifie qu'un agent ne travaille pas plus de 5 jours consécutifs (temps de trajet exclu), en comptant la série de
 * jours consécutifs qui contient la vacation cible (une série éloignée n'est pas de son fait).
 * @param {Array} zonedShifts - vacations avec `start` / `end` (withZonedBounds), triées par début
 * @param {string} targetDate - jour cible YYYY-MM-DD
 * @returns {Object} { ok: boolean, consecutiveDays: number }
 */
function checkConsecutiveWorkDays (zonedShifts, targetDate) {
    const targetIndex = targetIndexOf(zonedShifts, targetDate);
    if (!isWork(zonedShifts[targetIndex])) return { ok: true, consecutiveDays: 0 };

    const consecutiveDays = streakAround(zonedShifts, targetIndex, isWork).length;
    return { ok: consecutiveDays <= MAX_CONSECUTIVE_WORK_DAYS, consecutiveDays };
}

/**
 * Vérifie qu'un agent bénéficie d'au moins 12 heures de repos après une vacation de contrôle de nuit (travail entre
 * 00h00 et 06h00, heure du centre). Contrôle la cible si c'est un contrôle de nuit, ET la vacation qui la précède si
 * c'en est un (insérer la cible juste après une nuit raccourcit le repos de cette nuit).
 * @param {Array} zonedShifts - vacations avec `start` / `end` (withZonedBounds), triées par début
 * @param {string} targetDate - jour cible YYYY-MM-DD
 * @returns {Object} { ok: boolean, restAfterNightControl: number } (repos le plus court contrôlé, en minutes)
 */
function checkRestAfterNightControl (zonedShifts, targetDate) {
    const targetIndex = targetIndexOf(zonedShifts, targetDate);
    if (!isWork(zonedShifts[targetIndex])) return { ok: true, restAfterNightControl: 0 };

    let shortestRest = null;
    for (const nightIndex of [targetIndex - 1, targetIndex]) {
        const night = zonedShifts[nightIndex];
        const shiftAfterNight = zonedShifts[nightIndex + 1];
        if (!isNight(night) || !isWork(shiftAfterNight)) continue;
        const rest = restMinutes(night, shiftAfterNight);
        if (shortestRest === null || rest < shortestRest) shortestRest = rest;
    }

    return {
        ok: shortestRest === null || shortestRest >= MIN_REST_AFTER_NIGHT_MINUTES,
        restAfterNightControl: shortestRest ?? 0
    };
}

/**
 * Vérifie qu'un agent n'exerce pas plus de deux vacations de contrôle de nuit consécutives (jours consécutifs), en
 * comptant la série qui contient la cible.
 * @param {Array} zonedShifts - vacations avec `start` / `end` (withZonedBounds), triées par début
 * @param {string} targetDate - jour cible YYYY-MM-DD
 * @returns {Object} { ok: boolean, consecutiveNightControls: number }
 */
function checkConsecutiveNightControls (zonedShifts, targetDate) {
    const targetIndex = targetIndexOf(zonedShifts, targetDate);
    if (!isWork(zonedShifts[targetIndex])) return { ok: true, consecutiveNightControls: 0 };

    const consecutiveNightControls = streakAround(zonedShifts, targetIndex, isNight).length;
    return { ok: consecutiveNightControls <= MAX_CONSECUTIVE_NIGHT_CONTROLS, consecutiveNightControls };
}

/**
 * Vérifie qu'un agent bénéficie d'au moins 48 heures de repos après deux contrôles de nuit consécutifs.
 * Ne contrôle que les paires que la cible touche : elle en fait partie, ou c'est la vacation qui les suit.
 * @param {Array} zonedShifts - vacations avec `start` / `end` (withZonedBounds), triées par début
 * @param {string} targetDate - jour cible YYYY-MM-DD
 * @returns {Object} { ok: boolean, restAfterTwoNightControls: number } (repos le plus court en défaut, en minutes)
 */
function checkRestAfterTwoNightControls (zonedShifts, targetDate) {
    const targetIndex = targetIndexOf(zonedShifts, targetDate);
    if (!isWork(zonedShifts[targetIndex])) return { ok: true, restAfterTwoNightControls: 0 };

    let shortestViolation = null;

    // On regarde chaque triplet (nuit, nuit le lendemain, vacation suivante) de la liste triée par début
    for (let firstNightIndex = 0; firstNightIndex < zonedShifts.length - 1; firstNightIndex++) {
        const firstNight = zonedShifts[firstNightIndex];
        const secondNight = zonedShifts[firstNightIndex + 1];
        const shiftAfterNights = zonedShifts[firstNightIndex + 2];
        if (!isNight(firstNight) || !isNight(secondNight) || !isWork(shiftAfterNights)) continue;
        const nextDayOfFirstNight = Temporal.PlainDate.from(firstNight.date).add({ days: 1 }).toString();
        if (nextDayOfFirstNight !== secondNight.date) continue; // pas consécutives
        if (targetIndex < firstNightIndex || targetIndex > firstNightIndex + 2) continue; // la cible ne touche pas ce triplet

        const rest = restMinutes(secondNight, shiftAfterNights);
        if (rest < MIN_REST_AFTER_TWO_NIGHTS_MINUTES && (shortestViolation === null || rest < shortestViolation)) shortestViolation = rest;
    }

    return {
        ok: shortestViolation === null,
        restAfterTwoNightControls: shortestViolation ?? 0
    };
}

export {
    legalLimitsFor,
    checkMinimumRestTime,
    checkWeeklyRestPeriod,
    checkWeeklyWorkHours,
    checkConsecutiveWorkDays,
    checkRestAfterNightControl,
    checkConsecutiveNightControls,
    checkRestAfterTwoNightControls,
    windowStartingOn,
    longestRestIn,
    workMinutesIn,
    minutesBetween
};
