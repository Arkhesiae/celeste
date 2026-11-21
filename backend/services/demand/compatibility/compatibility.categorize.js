/**
 * Compatibilité d'une demande de remplacement / de permutation avec le planning d'un utilisateur.
 *
 * Le déroulé complet, les hypothèses et la forme du résultat sont décrits dans
 * docs/architecture/demand-categorization.md. En bref :
 *
 *   planning de l'utilisateur (generateShiftsMap)        la demande
 *                       \                                   /
 *                        '-- on pose la vacation de la demande à sa date, à la place de celle de l'utilisateur
 *                                         |
 *                               legalLimitsFor : 7 règles légales (compatibility.rules.js)
 *                                         |
 *                    categorize → { limit[], canSwitch, rest, invalidRest35, invalidWork48 }
 *
 * Modèle de temps (voir utils/shifts/shiftTime.js) :
 *   - une vacation = { date: 'YYYY-MM-DD' (jour de début), startTime: 'HH:mm', endTime: 'HH:mm', endsNextDay } ;
 *   - ces heures sont celles du centre ; toutes les vacations d'un planning sont dans le même fuseau (`timeZone`, celui
 *     du centre de l'utilisateur) ;
 *   - `legalLimitsFor` en fait des Temporal.ZonedDateTime UNE fois (`withZonedBounds`), et toutes les règles calculent
 *     sur ces instants : les durées sont réelles, y compris les jours de changement d'heure.
 */
import { posterDayOf } from '../../../utils/dates/dayAccess.js';
import Shift from '../../../models/Shift.js';
import { shiftMapToArray } from '../../planning/planning.shiftsMap.js';
import { getEffectiveShiftTimes } from '../../../utils/shifts/getEffectiveShiftTimes.js';
import { DEFAULT_TIME_ZONE } from '../../../utils/dates/constants.js';
import { legalLimitsFor } from './compatibility.rules.js';

/**
 * Pré-charge les shifts des acceptedSwitches une seule fois pour éviter N×M appels DB.
 * Utilise les shifts déjà populés si disponibles.
 * @returns {Promise<Map<string, Object>>} Map shiftId -> shift
 */
async function buildPreFetchedAcceptedShifts (demand) {
    const map = new Map();
    if (!demand?.acceptedSwitches?.length) return map;
    const isPopulated = (s) => s?.shift && typeof s.shift === 'object' && '_id' in s.shift && 'name' in s.shift;
    const populated = demand.acceptedSwitches.filter(isPopulated);
    const unpopulatedIds = demand.acceptedSwitches
        .filter(s => !isPopulated(s) && s.shift)
        .map(s => s.shift?._id ?? s.shift)
        .filter(Boolean);
    for (const s of populated) {
        map.set(s.shift._id.toString(), s.shift);
    }
    if (unpopulatedIds.length > 0) {
        const shifts = await Shift.find({ _id: { $in: unpopulatedIds } }).select('_id name').lean();
        for (const sh of shifts) {
            map.set(sh._id.toString(), sh);
        }
    }
    return map;
}

/**
 * Compatibilité de la demande avec le planning d'un utilisateur, pour UNE variante de la vacation de la demande.
 *
 * Étapes :
 *   1. on détermine les horaires effectifs de la vacation demandée : ceux de la variante donnée, ou à défaut les
 *      horaires par défaut du shift (hypothèse : tant qu'aucune variante n'est choisie, c'est l'horaire par défaut) ;
 *   2. on pose cette vacation dans une copie du planning, à la date de la demande (elle remplace ce que l'utilisateur
 *      avait ce jour-là) ;
 *   3. si l'utilisateur travaillait déjà ce jour-là : `alreadyWorking`. `canSwitch` est vrai si sa vacation du jour est
 *      l'une de celles que le demandeur accepte en échange (permutation) ;
 *   4. on évalue les règles légales (legalLimitsFor) sur le planning obtenu.
 *
 * `shiftsMap` est la map du planning de l'utilisateur. Pour évaluer d'autres variantes de SES propres vacations (calcul
 * optionnel), compatibility.variations.js passe une map modifiée.
 *
 * @param {Object} demand - la demande (posterShift, acceptedSwitches)
 * @param {Map<string, Object>} shiftsMap - planning de l'utilisateur, par jour
 * @param {Object|string|null} demandVariationOrNull - variante de la vacation demandée (null = horaires par défaut)
 * @param {Map<string, Object>} [preFetchedAcceptedShifts] - Map shiftId -> shift pour éviter les appels DB répétés
 * @param {string} [timeZone] - fuseau du centre de l'utilisateur
 * @returns {{ limit: string[], canSwitch: boolean, rest?: Object, invalidWindows35?: Array, invalidWindows48?: Array }}
 */
function checkCompatibilityForVariation (demand, shiftsMap, demandVariationOrNull, preFetchedAcceptedShifts = null, timeZone = DEFAULT_TIME_ZONE) {
    if (!demand?.posterShift?.shift) {
        return { limit: ['invalidDemand'], canSwitch: false };
    }
    const demandDate = posterDayOf(demand);
    const limit = [];
    let canSwitch = false;

    const shiftOfUserThatDay = shiftsMap.get(demandDate);

    const effectiveTimes = getEffectiveShiftTimes(demand.posterShift.shift, demandVariationOrNull);
    if (!effectiveTimes) return { limit: ['invalidShift'], canSwitch: false };

    const demandedShift = {
        shift: demand.posterShift.shift,
        team: demand.posterShift.shift.teamObject,
        date: demandDate,
        startTime: effectiveTimes.startTime,
        endTime: effectiveTimes.endTime,
        endsNextDay: effectiveTimes.endsNextDay,
    };

    // La vacation de la demande remplace celle de l'utilisateur ce jour-là (ou s'ajoute s'il était en repos)
    const planningWithDemand = new Map(shiftsMap);
    planningWithDemand.set(demandDate, demandedShift);
    const shiftsSorted = shiftMapToArray(planningWithDemand);

    if (shiftOfUserThatDay?.shift && shiftOfUserThatDay.shift.type !== "rest") {
        limit.push('alreadyWorking');
        // Permutation : travailler déjà ce jour-là est acceptable si sa vacation est l'une de celles acceptées en échange
        if (demand.acceptedSwitches?.length > 0) {
            for (const switchItem of demand.acceptedSwitches) {
                const shiftId = switchItem.shift?._id?.toString?.() ?? switchItem.shift?.toString?.();
                const acceptedShift = preFetchedAcceptedShifts?.get(shiftId) ?? (switchItem.shift && typeof switchItem.shift === 'object' ? switchItem.shift : null);
                if (acceptedShift && ((acceptedShift._id?.toString() === shiftOfUserThatDay.shift._id?.toString()) || (acceptedShift?.name === shiftOfUserThatDay.shift.name))) {
                    canSwitch = true;
                    break;
                }
            }
        }
    }

    const legal = legalLimitsFor(demandDate, shiftsSorted, timeZone);
    limit.push(...legal.limit);

    return {
        limit,
        canSwitch,
        rest: legal.rest,
        invalidWindows35: legal.invalidWindows35,
        invalidWindows48: legal.invalidWindows48,
    };
}

/**
 * Catégorise une demande pour un utilisateur : ajoute à la demande ses limites légales et ses indicateurs.
 *
 * Variante de la vacation demandée : celle que le demandeur a choisie (`posterShift.selectedVariation`) ; sinon les
 * horaires par défaut du shift. `options.selectedVariation` permet de simuler le choix d'une variante par l'utilisateur
 * qui consulte la demande : quand elle est fournie, elle est prise en compte à la place.
 * L'exploration de TOUTES les variantes possibles est un calcul à part, optionnel (compatibility.variations.js).
 *
 * @param {Object} demand - document de demande (méthode toObject)
 * @param {Map<string, Object>} shiftsMap - planning de l'utilisateur (generateShiftsMap), par jour
 * @param {{ selectedVariation?: Object|string|null, timeZone?: string }} [options] - `timeZone` : fuseau du centre de
 *   l'utilisateur (défaut : fuseau par défaut de l'application)
 * @returns {Promise<Object>} la demande + { limit, canSwitch, rest: { before, after }, invalidRest35, invalidWork48 }
 */
const categorize = async (demand, shiftsMap = null, options = {}) => {
    try {
        const demandWithLimit = demand.toObject();
        demandWithLimit.limit = [];

        if (!shiftsMap) {
            throw new Error("Shifts map not found");
        }

        const variation = options.selectedVariation ?? demand.posterShift?.selectedVariation ?? null;
        const preFetchedAcceptedShifts = await buildPreFetchedAcceptedShifts(demand);
        const result = checkCompatibilityForVariation(demand, shiftsMap, variation, preFetchedAcceptedShifts, options.timeZone ?? DEFAULT_TIME_ZONE);

        demandWithLimit.limit = result.limit;
        demandWithLimit.canSwitch = result.canSwitch;
        // Repos autour de la vacation demandée (minutes) et fenêtres de 7 jours en défaut, pour le graphique
        demandWithLimit.rest = { before: result.rest?.restBefore ?? 0, after: result.rest?.restAfter ?? 0 };
        demandWithLimit.invalidRest35 = result.invalidWindows35 ?? [];
        demandWithLimit.invalidWork48 = result.invalidWindows48 ?? [];

        return demandWithLimit;
    } catch (err) {
        console.error(`Erreur lors du traitement de la demande ${demand._id}:`, err);
        throw err;
    }
};

export {
    categorize,
    checkCompatibilityForVariation,
    buildPreFetchedAcceptedShifts
};
