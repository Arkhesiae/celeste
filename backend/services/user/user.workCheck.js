import { Temporal } from '@js-temporal/polyfill';
import User from '../../models/User.js';
import { findOrThrow } from '../../utils/mongo.js';
import { eachDay } from '../../utils/dates/plainDate.js';
import { withZonedBounds } from '../../utils/shifts/shiftTime.js';
import { isNightControl } from '../../utils/shifts/nightControl.js';
import {
    MIN_REST_MINUTES,
    WEEKLY_REST_MINUTES,
    MAX_WEEKLY_WORK_MINUTES,
    MIN_REST_AFTER_NIGHT_MINUTES,
    MIN_REST_AFTER_TWO_NIGHTS_MINUTES,
} from '../../config/workRules.js';
import { WORK_CHECK_MARGIN_DAYS } from '../../config/limits.js';
import { computeUserShifts } from '../planning/planning.userShifts.js';
import { shiftMapToArray, toShiftsMap } from '../planning/planning.shiftsMap.js';
import { getCenterTimeZone } from '../center/center.timezone.js';
import { windowStartingOn, longestRestIn, workMinutesIn, minutesBetween } from '../substitution/compatibility/compatibility.rules.js';

/**
 * Contrôle du temps de travail d'un utilisateur sur une période, pour le calendrier : temps travaillé de chaque jour, repos
 * avant chaque vacation, et chacune des périodes de 7 jours glissantes (travail cumulé, plus long repos continu).
 *
 * Mêmes règles, mêmes fonctions et mêmes seuils que le calcul de compatibilité des demandes
 * (`compatibility.rules.js`, `config/workRules.js`) : le calendrier affiche ce que la compatibilité appliquerait.
 */

const isWork = (zonedShift) => zonedShift?.shift?.type === 'work';
const isNight = (zonedShift) => isWork(zonedShift) && isNightControl(zonedShift);

/** Date et heure locale du centre, sans fuseau : `2026-03-10T22:00` */
const localMinute = (zonedDateTime) => zonedDateTime.toPlainDateTime().toString({ smallestUnit: 'minute' });

/**
 * Repos minimal exigé après la vacation d'indice `index` : 11 h ; 12 h après un contrôle de nuit ; 48 h après deux
 * contrôles de nuit sur deux jours consécutifs.
 */
const requiredRestAfter = (zonedShifts, index) => {
    const previous = zonedShifts[index];
    let required = MIN_REST_MINUTES;
    if (isNight(previous)) {
        required = Math.max(required, MIN_REST_AFTER_NIGHT_MINUTES);
        const before = zonedShifts[index - 1];
        if (isNight(before) && Temporal.PlainDate.from(before.date).add({ days: 1 }).toString() === previous.date) {
            required = Math.max(required, MIN_REST_AFTER_TWO_NIGHTS_MINUTES);
        }
    }
    return required;
};

/**
 * Analyse un planning.
 *
 * @param {Object} data
 * @param {Array} data.shifts - vacations travaillées triées (`shiftMapToArray`) : { date, startTime, endTime, endsNextDay, shift }
 *   — il faut y inclure la marge avant `from` et après `to`, pour que les périodes du bord et le repos avant la première
 *   vacation soient justes
 * @param {string} data.timeZone - fuseau du centre
 * @param {string} data.from - premier jour demandé YYYY-MM-DD
 * @param {string} data.to - dernier jour demandé YYYY-MM-DD
 * @returns {{
 *   days: Array<{ date: string, workedMinutes: number, shifts: Array<{ name: string, startTime: string, endTime: string, endsNextDay: boolean }>,
 *     rest: null | { minutes: number, requiredMinutes: number, ok: boolean, from: string, to: string } }>,
 *   windows: Array<{ start: string, end: string, workMinutes: number, longestRestMinutes: number, longestRestFrom: string|null,
 *     longestRestTo: string|null, workOk: boolean, restOk: boolean }>
 * }}
 *   Un jour est celui où commence la vacation (une nuit 19:15-06:15 compte en entier le jour où elle commence). `rest` : le
 *   repos avant la vacation du jour qui a le moins de marge (null s'il n'y a pas de vacation ou pas de précédente). Les
 *   périodes de 7 jours sont toutes celles qui chevauchent [from, to], de `from - 6` à `to`.
 */
export function analyzeWork ({ shifts, timeZone, from, to }) {
    const zoned = withZonedBounds(shifts, timeZone);

    const days = eachDay(from, to).map((date) => {
        const ofDay = zoned.map((shift, index) => ({ shift, index })).filter(({ shift }) => shift.date === date);

        let rest = null;
        for (const { shift, index } of ofDay) {
            if (index === 0) continue;   // pas de vacation avant elle dans les données chargées
            const previous = zoned[index - 1];
            const minutes = minutesBetween(previous.end, shift.start);
            const requiredMinutes = requiredRestAfter(zoned, index - 1);
            if (!rest || minutes - requiredMinutes < rest.minutes - rest.requiredMinutes) {
                rest = { minutes, requiredMinutes, ok: minutes >= requiredMinutes, from: localMinute(previous.end), to: localMinute(shift.start) };
            }
        }

        return {
            date,
            workedMinutes: ofDay.reduce((sum, { shift }) => sum + minutesBetween(shift.start, shift.end), 0),
            shifts: ofDay.map(({ shift }) => ({
                name: shift.shift?.name ?? '',
                startTime: shift.startTime,
                endTime: shift.endTime,
                endsNextDay: Boolean(shift.endsNextDay),
            })),
            rest,
        };
    });

    const firstWindow = Temporal.PlainDate.from(from).subtract({ days: 6 });
    const windows = eachDay(firstWindow, to).map((start) => {
        const window = windowStartingOn(start, timeZone);
        const workMinutes = workMinutesIn(zoned, window);
        const longestRest = longestRestIn(zoned, window);
        return {
            start,
            end: Temporal.PlainDate.from(start).add({ days: 6 }).toString(),
            workMinutes,
            longestRestMinutes: longestRest.minutes,
            longestRestFrom: longestRest.from ? localMinute(longestRest.from) : null,
            longestRestTo: longestRest.to ? localMinute(longestRest.to) : null,
            workOk: workMinutes <= MAX_WEEKLY_WORK_MINUTES,
            restOk: longestRest.minutes >= WEEKLY_REST_MINUTES,
        };
    });

    return { days, windows };
}

/**
 * Contrôle du temps de travail d'un utilisateur du jour `from` au jour `to` (inclus).
 * Renvoie aussi les seuils appliqués, pour que le client n'ait aucune règle à recopier.
 *
 * @param {string} userId
 * @param {{ from: string, to: string }} period - jours YYYY-MM-DD
 */
export async function getWorkCheck (userId, { from, to }) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé', select: 'centerId' });
    const timeZone = await getCenterTimeZone(user.centerId);

    const loadedFrom = Temporal.PlainDate.from(from).subtract({ days: WORK_CHECK_MARGIN_DAYS });
    const loadedTo = Temporal.PlainDate.from(to).add({ days: WORK_CHECK_MARGIN_DAYS });
    const planning = await computeUserShifts(eachDay(loadedFrom, loadedTo), userId);
    const shifts = shiftMapToArray(toShiftsMap(planning));

    return {
        period: { from, to },
        timeZone,
        limits: {
            minRestMinutes: MIN_REST_MINUTES,
            weeklyRestMinutes: WEEKLY_REST_MINUTES,
            maxWeeklyWorkMinutes: MAX_WEEKLY_WORK_MINUTES,
        },
        ...analyzeWork({ shifts, timeZone, from, to }),
    };
}
