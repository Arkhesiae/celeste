import { computeUserShifts } from './computeUserShifts.js';
import Shift from '../models/Shift.js';
import { shiftMapToArray } from './generateShiftsMap.js';
import { parseShiftUTC } from './parseShiftTime.js';
import { getEffectiveShiftTimes } from './getEffectiveShiftTimes.js';
// Constantes pour améliorer la lisibilité et la maintenance
const MIN_REST_MINUTES = 11 * 60;

/**
 * Variante concrète choisie par le fetcher (pas vic/disp, pas vide).
 * Si true, on ne ré-explore pas les variantes de ce jour.
 */
function hasConcreteFetcherVariation (selectedVariation) {
    if (selectedVariation == null) return false;
    if (selectedVariation === 'vic' || selectedVariation === 'disp') return false;
    if (typeof selectedVariation === 'object') {
        return Boolean(selectedVariation._id || selectedVariation.startTime);
    }
    const id = selectedVariation?.toString?.();
    return Boolean(id && id !== '[object Object]');
}

/** Différence en jours UTC entre deux YYYY-MM-DD */
function utcDayDiff (a, b) {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    const ms = Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd);
    return Math.round(ms / 86400000);
}

/**
 * Complexité des calculs par paire de compatibilité :
 * - demandVariations × fetcherCombos appels à checkCompatibilityForVariation
 * - Sans borne : produit cartésien sur ±12j de vacations multi-variantes → OOM
 */
const MAX_COMPATIBILITY_COMBOS = 128;
/** Fenêtre autour de la demande où les variantes fetcher impactent vraiment 11h/35h/48h */
const AMBIGUOUS_DAY_RADIUS = 7;
/** Nombre max de jours ambigus explorés (les plus proches de la demande) */
const MAX_AMBIGUOUS_DATES = 4;

/**
 * Dates ambigües proches de la demande uniquement (évite le produit sur toute la map ±12j).
 */
function selectAmbiguousFetcherDates (shiftsMap, demandDateStr) {
    const candidates = [];
    for (const [dateStr, entry] of shiftsMap) {
        if (entry?.shift?.variations?.length < 2) continue;
        if (hasConcreteFetcherVariation(entry.selectedVariation)) continue;
        const diff = Math.abs(utcDayDiff(demandDateStr, dateStr));
        if (diff > AMBIGUOUS_DAY_RADIUS) continue;
        candidates.push({ dateStr, diff });
    }
    candidates.sort((a, b) => a.diff - b.diff || a.dateStr.localeCompare(b.dateStr));
    return candidates.slice(0, MAX_AMBIGUOUS_DATES).map((c) => c.dateStr);
}

/**
 * Produit cartésien borné : arrête dès maxCombos atteints (pas de materialisation géante).
 * @param {string[]} ambiguousDates
 * @param {Map} shiftsMap
 * @param {number} maxCombos
 * @returns {Array<{[dateStr]: variation}>}
 */
function getFetcherVariationCombinations (ambiguousDates, shiftsMap, maxCombos = MAX_COMPATIBILITY_COMBOS) {
    if (ambiguousDates.length === 0) return [{}];

    const variationsByDate = ambiguousDates.map((d) => {
        const vars = shiftsMap.get(d)?.shift?.variations;
        if (!vars || vars.length === 0) return [null];
        return [null, ...vars];
    });

    const result = [];
    const backtrack = (idx, combo) => {
        if (result.length >= maxCombos) return;
        if (idx === ambiguousDates.length) {
            result.push({ ...combo });
            return;
        }
        for (const v of variationsByDate[idx]) {
            if (result.length >= maxCombos) return;
            combo[ambiguousDates[idx]] = v;
            backtrack(idx + 1, combo);
        }
    };
    backtrack(0, {});
    return result;
}

/**
 * Construit une map locale en appliquant éventuellement des overrides de variantes pour les vacations du fetcher.
 * fetcherVariationOverrides: { [dateStr]: variation } pour les jours ambigus (sans variante choisie).
 */
function buildLocalMapWithOverrides (shiftsMap, demandDateStr, demandData, fetcherVariationOverrides = {}) {
    const localMap = new Map();
    for (const [dateStr, entry] of shiftsMap) {
        if (dateStr === demandDateStr) {
            localMap.set(dateStr, demandData);
            continue;
        }
        const override = fetcherVariationOverrides[dateStr];
        if (override && entry?.shift) {
            const effectiveTimes = getEffectiveShiftTimes(entry.shift, override);
            if (effectiveTimes) {
                localMap.set(dateStr, {
                    shift: entry.shift,
                    team: entry.team,
                    date: dateStr,
                    start: parseShiftUTC(dateStr, effectiveTimes.startTime, false),
                    end: parseShiftUTC(dateStr, effectiveTimes.endTime, effectiveTimes.endsNextDay ?? false),
                });
                continue;
            }
        }
        localMap.set(dateStr, { ...entry, start: entry.start, end: entry.end });
    }
    // La date de la demande peut être absente de shiftsMap (fetcher en repos ce jour-là)
    if (!localMap.has(demandDateStr)) {
        localMap.set(demandDateStr, demandData);
    }
    return localMap;
}

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
 * Vérifie la compatibilité pour une variation de la demande et optionnellement des overrides pour les vacations du fetcher.
 * Retourne { limit: string[], canSwitch: boolean }.
 * @param {Map<string, Object>} [preFetchedAcceptedShifts] - Map shiftId -> shift pour éviter les appels DB répétés
 */
function checkCompatibilityForVariation (demand, shiftsMap, demandVariationOrNull, fetcherVariationOverrides = {}, preFetchedAcceptedShifts = null) {
    if (!demand?.posterShift?.shift) {
        return { limit: ['invalidDemand'], canSwitch: false };
    }
    const demandDate = new Date(demand.posterShift.date);
    const limit = [];
    let canSwitch = false;

    const demandDateStr = demandDate.toISOString().split('T')[0];
    const vacationOfFetcher = shiftsMap.get(demandDateStr);

    const effectiveTimes = getEffectiveShiftTimes(demand.posterShift.shift, demandVariationOrNull);
    if (!effectiveTimes) return { limit: ['invalidShift'], canSwitch: false };

    const demandData = {
        shift: demand.posterShift.shift,
        team: demand.posterShift.shift.teamObject,
        date: demandDateStr,
        start: parseShiftUTC(demandDateStr, effectiveTimes.startTime, false),
        end: parseShiftUTC(demandDateStr, effectiveTimes.endTime, effectiveTimes.endsNextDay),
    };

    const localMap = buildLocalMapWithOverrides(shiftsMap, demandDateStr, demandData, fetcherVariationOverrides);
    const shiftsSorted = shiftMapToArray(localMap);
    const index = shiftsSorted.findIndex(s => s.date === demandDateStr);

    if (vacationOfFetcher?.shift && vacationOfFetcher.shift.type !== "rest") {
        limit.push('alreadyWorking');
        if (demand.acceptedSwitches?.length > 0) {
            for (const switchItem of demand.acceptedSwitches) {
                const shiftId = switchItem.shift?._id?.toString?.() ?? switchItem.shift?.toString?.();
                const shift = preFetchedAcceptedShifts?.get(shiftId) ?? (switchItem.shift && typeof switchItem.shift === 'object' ? switchItem.shift : null);
                if (shift && ((shift._id?.toString() === vacationOfFetcher.shift._id?.toString()) || (shift?.name === vacationOfFetcher.shift.name))) {
                    canSwitch = true;
                    break;
                }
            }
        }
    }

    const computeRest = checkMinimumRestTime(shiftsSorted, index);
    const { restOk } = checkWeeklyRestPeriod(demandDate, shiftsSorted, true);
    const { workOk } = checkWeeklyWorkHours(demandDate, shiftsSorted, true);

    if (!computeRest.ok) limit.push('insufficientRest');
    if (!restOk) limit.push('35limit');
    if (!workOk) limit.push('48hLimit');

    return { limit, canSwitch };
}

const categorize = async (demand, shiftsMap = null) => {
    try {
        const demandDate = new Date(demand.posterShift.date);
        let demandWithLimit = demand.toObject();
        demandWithLimit.limit = [];
        demandWithLimit.compatibleVariations = [];
        demandWithLimit.compatibleFetcherVariationsByDate = [];
        demandWithLimit.compatiblePairsByFetcherDate = [];
        demandWithLimit.potentiallyCompatible = false;

        if (!shiftsMap) {
            throw new Error("Shifts map not found");
        }

        const shift = demand.posterShift?.shift;
        const hasVariations = shift?.variations?.length >= 2;
        const noSelectedVariation = !demand.posterShift?.selectedVariation;

        const preFetchedAcceptedShifts = await buildPreFetchedAcceptedShifts(demand);
        const result = checkCompatibilityForVariation(demand, shiftsMap, demand.posterShift?.selectedVariation, {}, preFetchedAcceptedShifts);
        demandWithLimit.limit = result.limit;
        demandWithLimit.canSwitch = result.canSwitch;

        demandWithLimit.rest = { before: 0, after: 0 };
        const localMap = new Map(shiftsMap);
        const effectiveTimes = getEffectiveShiftTimes(shift, demand.posterShift?.selectedVariation);
        if (effectiveTimes) {
            const dateStr = demandDate.toISOString().split('T')[0];
            const demandData = {
                shift,
                team: shift?.teamObject,
                date: dateStr,
                start: parseShiftUTC(dateStr, effectiveTimes.startTime, false),
                end: parseShiftUTC(dateStr, effectiveTimes.endTime, effectiveTimes.endsNextDay),
            };
            localMap.set(dateStr, demandData);
            const shiftsSorted = shiftMapToArray(localMap);
            const index = shiftsSorted.findIndex(s => s.date === dateStr);
            const computeRest = checkMinimumRestTime(shiftsSorted, index);
            demandWithLimit.rest = { before: computeRest.restBefore, after: computeRest.restAfter };
        }
        const { invalidWindows35 } = checkWeeklyRestPeriod(demandDate, shiftMapToArray(localMap), true);
        const { invalidWindows48 } = checkWeeklyWorkHours(demandDate, shiftMapToArray(localMap), true);
        demandWithLimit.invalidRest35 = invalidWindows35;
        demandWithLimit.invalidWork48 = invalidWindows48;

        // Jours ambigus proches de la demande uniquement (évite OOM sur produit ±12j)
        const demandDateStr = demandDate.toISOString().split('T')[0];
        const ambiguousFetcherDates = selectAmbiguousFetcherDates(shiftsMap, demandDateStr);

        const demandVariationsToTry = (hasVariations && noSelectedVariation)
            ? (shift.variations || [])
            : [demand.posterShift?.selectedVariation ?? null];

        let anyPass = false;
        let anyFail = false;
        const compatibleDemandVariationIds = new Set();
        /** Pour chaque date ambigüe du fetcher, les variantes qui font passer au moins une combo */
        const compatibleFetcherByDate = new Map();
        /** Quand poster ET fetcher sont ambigus : date -> fetcherVarKey -> Set(demandVarIds) */
        const compatiblePairsByFetcherDate = new Map();

        const maxFetcherCombos = Math.max(
            1,
            Math.floor(MAX_COMPATIBILITY_COMBOS / Math.max(1, demandVariationsToTry.length))
        );
        const combosToIterate = getFetcherVariationCombinations(
            ambiguousFetcherDates,
            shiftsMap,
            maxFetcherCombos
        );

        for (const demandVar of demandVariationsToTry) {
            for (const fetcherCombo of combosToIterate) {
                const vr = checkCompatibilityForVariation(demand, shiftsMap, demandVar, fetcherCombo, preFetchedAcceptedShifts);
                if (vr.limit.length === 0) {
                    anyPass = true;
                    if (hasVariations && noSelectedVariation && demandVar) {
                        compatibleDemandVariationIds.add((demandVar._id || demandVar)?.toString?.());
                        if (ambiguousFetcherDates.length > 0) {
                            for (const d of ambiguousFetcherDates) {
                                const v = fetcherCombo[d];
                                const fetcherKey = (v?._id || v)?.toString?.() ?? 'default';
                                if (!compatiblePairsByFetcherDate.has(d)) compatiblePairsByFetcherDate.set(d, new Map());
                                if (!compatiblePairsByFetcherDate.get(d).has(fetcherKey)) compatiblePairsByFetcherDate.get(d).set(fetcherKey, new Set());
                                compatiblePairsByFetcherDate.get(d).get(fetcherKey).add((demandVar._id || demandVar)?.toString?.());
                            }
                        }
                    }
                    if (!noSelectedVariation && ambiguousFetcherDates.length > 0) {
                        for (const d of ambiguousFetcherDates) {
                            const v = fetcherCombo[d];
                            if (!compatibleFetcherByDate.has(d)) compatibleFetcherByDate.set(d, new Set());
                            const key = (v?._id || v)?.toString?.() ?? 'default';
                            compatibleFetcherByDate.get(d).add(key);
                        }
                    }
                } else {
                    anyFail = true;
                }
            }
        }

        if (hasVariations && noSelectedVariation) {
            const variations = shift.variations || [];
            demandWithLimit.compatibleVariations = variations
                .filter(v => compatibleDemandVariationIds.has((v._id || v)?.toString?.()))
                .map(v => ({ _id: v._id || v, name: v?.name, startTime: v?.startTime, endTime: v?.endTime }));
            if (compatiblePairsByFetcherDate.size > 0) {
                const baseShiftName = shift?.name || '';
                demandWithLimit.compatiblePairsByFetcherDate = ambiguousFetcherDates.map(dateStr => {
                    const entry = shiftsMap.get(dateStr);
                    const pairsMap = compatiblePairsByFetcherDate.get(dateStr);
                    if (!entry?.shift || !pairsMap) return null;
                    const fetcherShiftName = entry.shift?.name || '';
                    const pairs = [];
                    if (pairsMap.has('default')) {
                        const demandIds = pairsMap.get('default');
                        const demandVars = variations.filter(v => demandIds.has((v._id || v)?.toString?.()));
                        if (demandVars.length > 0) {
                            pairs.push({
                                fetcherVariation: { name: '', isDefault: true },
                                demandVariations: demandVars.map(v => ({ _id: v._id || v, name: v?.name })),
                            });
                        }
                    }
                    for (const fv of entry.shift?.variations || []) {
                        const key = (fv._id || fv)?.toString?.();
                        if (!pairsMap.has(key)) continue;
                        const demandIds = pairsMap.get(key);
                        const demandVars = variations.filter(v => demandIds.has((v._id || v)?.toString?.()));
                        if (demandVars.length > 0) {
                            pairs.push({
                                fetcherVariation: { _id: fv._id || fv, name: fv?.name, isDefault: false },
                                demandVariations: demandVars.map(v => ({ _id: v._id || v, name: v?.name })),
                            });
                        }
                    }
                    if (pairs.length === 0) return null;
                    const totalFetcherOptions = 1 + (entry.shift?.variations?.length || 0);
                    const totalDemandVariations = variations.length;
                    const allDemandPass = pairs.every(p => p.demandVariations.length >= totalDemandVariations);
                    if (pairs.length >= totalFetcherOptions && allDemandPass) return null;
                    return { date: dateStr, shiftName: fetcherShiftName, baseShiftName, totalDemandVariations, totalFetcherVariations: totalFetcherOptions, pairs };
                }).filter(Boolean);
            }
        }
        if (!noSelectedVariation && compatibleFetcherByDate.size > 0) {
            const totalOptionsByDate = new Map();
            for (const d of ambiguousFetcherDates) {
                const entry = shiftsMap.get(d);
                const total = 1 + (entry?.shift?.variations?.length || 0);
                totalOptionsByDate.set(d, total);
            }
            demandWithLimit.compatibleFetcherVariationsByDate = ambiguousFetcherDates.map(dateStr => {
                const entry = shiftsMap.get(dateStr);
                const passingIds = compatibleFetcherByDate.get(dateStr);
                const totalOptions = totalOptionsByDate.get(dateStr) || 1;
                if (!entry?.shift || !passingIds || passingIds.size >= totalOptions) return null;
                const shiftName = entry.shift?.name || '';
                const variations = [];
                if (passingIds.has('default')) {
                    variations.push({ name: '', isDefault: true });
                }
                for (const v of entry.shift?.variations || []) {
                    if (passingIds.has((v._id || v)?.toString?.())) {
                        variations.push({ _id: v._id || v, name: v?.name, isDefault: false });
                    }
                }
                return { date: dateStr, shiftName, variations };
            }).filter(Boolean);
        }
        demandWithLimit.potentiallyCompatible = anyPass && anyFail;

        return demandWithLimit;
    } catch (err) {
        console.error(`Erreur lors du traitement de la demande ${demand._id}:`, err);
        throw err;
    }
};



// const insertDemandShift = (demand, shiftsMap) => {
//     const demandDate = new Date(demand.posterShift.date);
//     shiftsMap.set(demandDate.toISOString().split('T')[0], {
//         shift: demand.posterShift.shift,
//         team: demand.posterShift.shift.teamObject,
//         date: demandDate.toISOString().split('T')[0],
//         start: demand.posterShift.shift.default.startTime,
//         end: demand.posterShift.shift.default.endTime,
//     });

// }


/**
 * Simule l'insertion d'un shift dans une liste triée chronologiquement
 * @param {Object} targetShift - Le shift à insérer
 * @param {string} targetDate - Date au format YYYY-MM-DD
 * @param {Array} shiftsSorted - Liste des shifts triés chronologiquement
 * @returns {Array} Nouvelle liste avec le shift inséré
 */
function simulateInsertShift (targetShift, targetDate, shiftsSorted) {
    const localShiftsSorted = shiftsSorted.slice();

    let startTime = targetShift?.default?.startTime;
    let endTime = targetShift?.default?.endTime;
    if (!startTime || !endTime) {
        throw new Error("Invalid shift" + targetShift);
    }
    const start = parseShiftUTC(targetDate, startTime);
    const end = parseShiftUTC(targetDate, endTime, targetShift?.default?.endsNextDay);

    const newShift = { shift: targetShift, team: targetShift.teamObject, date: targetDate, start, end };

    const targetShiftIndex = localShiftsSorted.findIndex(s => s.date === targetDate.toISOString().split('T')[0]);

    if (targetShiftIndex !== -1) {
        // Si le shift existe déjà à cette date, on le remplace
        localShiftsSorted[targetShiftIndex] = newShift;
    } else {
        // Sinon, on l'insère au bon endroit selon la date
        const insertIndex = localShiftsSorted.findIndex(s => new Date(s.date) > new Date(targetDate));
        if (insertIndex === -1) {
            // Si aucune date plus grande n'est trouvée, on ajoute à la fin
            localShiftsSorted.push(newShift);
        } else {
            // Sinon on insère à la position trouvée
            localShiftsSorted.splice(insertIndex, 0, newShift);
        }
    }

    return localShiftsSorted;
}



/**
 * Vérifie s'il y a au moins 11h de repos avant et après le shift cible
 * @param {Object} targetShift - Le shift en question
 * @param {string} targetDate - Date au format YYYY-MM-DD
 * @param {Array} shiftsSorted - Liste des shifts triés chronologiquement
 * @returns {Object} { restBefore: number, restAfter: number, ok: boolean }
 */
function checkMinimumRestTime (shiftsSorted, index) {
    if (shiftsSorted[index].shift.type !== 'work') return { restBefore: 0, restAfter: 0, ok: true };

    let previousShift = shiftsSorted[index - 1];
    let nextShift = shiftsSorted[index + 1];

    const targetStart = shiftsSorted[index].start;
    const targetEnd = shiftsSorted[index].end;

    let result = {
        restBefore: 0,
        restAfter: 0,
        ok: true,
    }

    if (previousShift) {
        result.restBefore = (targetStart - previousShift.end) / (60 * 1000);
        if (result.restBefore < MIN_REST_MINUTES) result.ok = false;
    }

    if (nextShift) {
        result.restAfter = (nextShift.start - targetEnd) / (60 * 1000);
        if (result.restAfter < MIN_REST_MINUTES) result.ok = false;
    }

    return result;
}




function checkWeeklyRestPeriod (targetDate, shiftsSorted, fullScan = false) {
    let restOk;
    const invalidWindows35 = [];

    const targetDateNorm = new Date(Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate()
    ));

    for (let i = 0; i < 13; i++) {
        restOk = false;
        let longestRest = 0;
        let longestRestStart = null;
        let longestRestEnd = null;

        const windowStart = new Date(targetDateNorm);
        windowStart.setUTCDate(windowStart.getUTCDate() + i - 6);
        windowStart.setUTCHours(0, 0, 0, 0);
        const windowEnd = new Date(windowStart);
        windowEnd.setUTCDate(windowEnd.getUTCDate() + 7);
        // start < windowEnd : un service qui commence pile à la fin de fenêtre
        // n'appartient pas à la plage de 7j (aligné v1).
        const windowShifts = shiftsSorted
            .filter(s => new Date(s.end) >= windowStart && new Date(s.start) < windowEnd)
            .sort((a, b) => new Date(a.start) - new Date(b.start));

        let lastEnd = new Date(windowStart);

        if (windowShifts.length === 0) {
            restOk = true;
        }
        for (let j = 0; j < windowShifts.length; j++) {
            const s = windowShifts[j];
            const shiftStart = new Date(s.start);
            const shiftEnd = new Date(s.end);
            // Nuit chevauchant le début de fenêtre : déjà en service → pas de repos initial
            if (shiftStart < lastEnd) {
                if (shiftEnd > lastEnd) lastEnd = shiftEnd;
                if (j === windowShifts.length - 1) {
                    const restMinutesToEnd = (windowEnd - lastEnd) / (60 * 1000);
                    if (restMinutesToEnd > longestRest) {
                        longestRest = restMinutesToEnd;
                        longestRestStart = new Date(lastEnd);
                        longestRestEnd = new Date(windowEnd);
                    }
                    if (restMinutesToEnd >= 35 * 60) {
                        restOk = true;
                    }
                }
                continue;
            }
            const restMinutes = (shiftStart - lastEnd) / (60 * 1000);

            if (restMinutes > longestRest) {
                longestRest = restMinutes;
                longestRestStart = lastEnd;
                longestRestEnd = shiftStart;
            }

            if (restMinutes >= 35 * 60) {
                restOk = true;
                break;
            }
            lastEnd = shiftEnd > lastEnd ? shiftEnd : lastEnd;

            if (j === windowShifts.length - 1) {
                const restMinutesToEnd = (windowEnd - lastEnd) / (60 * 1000);
                if (restMinutesToEnd > longestRest) {
                    longestRest = restMinutesToEnd;
                    longestRestStart = lastEnd;
                    longestRestEnd = windowEnd;
                }
                if (restMinutesToEnd >= 35 * 60) {
                    restOk = true;
                }
            }
        }

        if (!restOk) {
            invalidWindows35.push({
                windowStart,
                windowEnd,
                longestRest,
                longestRestStart,
                longestRestEnd
            });
            if (!fullScan) break;
        }
    }
    return { restOk: invalidWindows35.length === 0, invalidWindows35 };
}

function checkWeeklyWorkHours (targetDate, shiftsSorted, fullScan = false) {
    const invalidWindows48 = [];

    const targetDateNorm = new Date(Date.UTC(
        new Date(targetDate).getUTCFullYear(),
        new Date(targetDate).getUTCMonth(),
        new Date(targetDate).getUTCDate()
    ));

    for (let i = 0; i < 13; i++) {
        let totalWorkMinutes = 0;
        let windowWorkOk = true;

        const windowStart = new Date(targetDateNorm);
        windowStart.setUTCDate(windowStart.getUTCDate() + i - 6);
        windowStart.setUTCHours(0, 0, 0, 0);
        const windowEnd = new Date(windowStart);
        windowEnd.setUTCDate(windowEnd.getUTCDate() + 7);

        const windowShifts = shiftsSorted.filter(s =>
            new Date(s.end) > windowStart && new Date(s.start) < windowEnd
        );

        for (const s of windowShifts) {
            const shiftStart = new Date(s.start);
            const shiftEnd = new Date(s.end);
            const overlapStart = shiftStart < windowStart ? windowStart : shiftStart;
            const overlapEnd = shiftEnd > windowEnd ? windowEnd : shiftEnd;
            totalWorkMinutes += Math.max(0, (overlapEnd - overlapStart) / (60 * 1000));
            if (totalWorkMinutes > 48 * 60) {
                windowWorkOk = false;
                break;
            }
        }

        if (!windowWorkOk) {
            invalidWindows48.push({
                windowStart,
                windowEnd,
                totalWorkMinutes,
            });
            if (!fullScan) break;
        }
    }
    return { workOk: invalidWindows48.length === 0, invalidWindows48 };
}


/**
 * Vérifie qu'un agent ne travaille pas plus de 5 jours consécutifs (temps de trajet exclu)
 * @param {Object} targetShift - Le shift en question
 * @param {string} targetDate - Date au format YYYY-MM-DD
 * @param {Array} shiftsSorted - Array des shifts triés chronologiquement
 * @returns {Object} { ok: boolean, consecutiveDays: number }
 */
function checkConsecutiveWorkDays (targetShift, targetDate, shiftsSorted) {
    if (targetShift.type !== 'work') return { ok: true, consecutiveDays: 0 };

    // const localShiftsSorted = simulateInsertShift(targetShift, targetDate, shiftsSorted);

    let maxConsecutiveDays = 0;
    let currentConsecutiveDays = 0;
    let currentDate = null;

    for (const shift of shiftsSorted) {
        if (shift.shift.type === 'work') {
            const shiftDate = new Date(shift.date);

            if (currentDate === null) {
                currentConsecutiveDays = 1;
                currentDate = shiftDate;
            } else {
                const daysDiff = Math.floor((shiftDate - currentDate) / (1000 * 60 * 60 * 24));

                if (daysDiff === 1) {
                    // Jour consécutif
                    currentConsecutiveDays++;
                } else if (daysDiff === 0) {
                    // Même jour, on ne compte pas
                    continue;
                } else {
                    // Jour non consécutif, on réinitialise
                    maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);
                    currentConsecutiveDays = 1;
                }
                currentDate = shiftDate;
            }
        } else {
            // Shift de repos, on réinitialise le compteur
            maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);
            currentConsecutiveDays = 0;
            currentDate = null;
        }
    }

    // Vérifier le dernier groupe
    maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);

    return {
        ok: maxConsecutiveDays <= 5,
        consecutiveDays: maxConsecutiveDays
    };
}

/**
 * Vérifie qu'un agent bénéficie d'une période de repos minimale de 12 heures après une vacation de contrôle de nuit
 * @param {Object} targetShift - Le shift en question
 * @param {string} targetDate - Date au format YYYY-MM-DD
 * @param {Array} shiftsSorted - Array des shifts triés chronologiquement
 * @returns {Object} { ok: boolean, restAfterNightControl: number }
 */
function checkRestAfterNightControl (targetShift, targetDate, shiftsSorted) {
    if (targetShift.type !== 'work') return { ok: true, restAfterNightControl: 0 };

    const targetStart = parseShiftUTC(targetDate, targetShift?.default?.startTime);
    const targetEnd = parseShiftUTC(targetDate, targetShift?.default?.endTime, targetShift?.default?.endsNextDay);

    // Vérifier si c'est un contrôle de nuit (entre 00h00 et 06h00)
    const isNightControl = targetStart.getHours() >= 0 && targetStart.getHours() < 6;

    if (!isNightControl) return { ok: true, restAfterNightControl: 0 };

    // Chercher le prochain shift après ce contrôle de nuit
    let nextShift = null;
    for (const shift of shiftsSorted) {
        if (shift.shift.type === 'work' && shift.start > targetEnd) {
            nextShift = shift;
            break;
        }
    }

    if (!nextShift) return { ok: true, restAfterNightControl: 0 };

    const restMinutes = (nextShift.start - targetEnd) / (60 * 1000);
    const requiredRestMinutes = 12 * 60; // 12 heures

    return {
        ok: restMinutes >= requiredRestMinutes,
        restAfterNightControl: restMinutes
    };
}

/**
 * Vérifie qu'un agent ne peut exercer plus de deux vacations de contrôle consécutives empiétant sur la plage 00h00-06h00
 * @param {Object} targetShift - Le shift en question
 * @param {string} targetDate - Date au format YYYY-MM-DD
 * @param {Array} shiftsSorted - Array des shifts triés chronologiquement
 * @returns {Object} { ok: boolean, consecutiveNightControls: number }
 */
function checkConsecutiveNightControls (targetShift, targetDate, shiftsSorted) {
    if (targetShift.type !== 'work') return { ok: true, consecutiveNightControls: 0 };

    // const localShiftsSorted = simulateInsertShift(targetShift, targetDate, shiftsSorted);

    let maxConsecutiveNightControls = 0;
    let currentConsecutiveNightControls = 0;
    let currentDate = null;

    for (const shift of localShiftsSorted) {
        if (shift.shift.type === 'work') {
            const shiftStart = parseShiftUTC(shift.date, shift.shift?.default?.startTime);
            const isNightControl = shiftStart.getHours() >= 0 && shiftStart.getHours() < 6;

            if (isNightControl) {
                const shiftDate = new Date(shift.date);

                if (currentDate === null) {
                    currentConsecutiveNightControls = 1;
                    currentDate = shiftDate;
                } else {
                    const daysDiff = Math.floor((shiftDate - currentDate) / (1000 * 60 * 60 * 24));

                    if (daysDiff === 1) {
                        // Jour consécutif
                        currentConsecutiveNightControls++;
                    } else if (daysDiff === 0) {
                        // Même jour, on ne compte pas
                        continue;
                    } else {
                        // Jour non consécutif, on réinitialise
                        maxConsecutiveNightControls = Math.max(maxConsecutiveNightControls, currentConsecutiveNightControls);
                        currentConsecutiveNightControls = 1;
                    }
                    currentDate = shiftDate;
                }
            } else {
                // Shift de jour, on réinitialise le compteur
                maxConsecutiveNightControls = Math.max(maxConsecutiveNightControls, currentConsecutiveNightControls);
                currentConsecutiveNightControls = 0;
                currentDate = null;
            }
        } else {
            // Shift de repos, on réinitialise le compteur
            maxConsecutiveNightControls = Math.max(maxConsecutiveNightControls, currentConsecutiveNightControls);
            currentConsecutiveNightControls = 0;
            currentDate = null;
        }
    }

    // Vérifier le dernier groupe
    maxConsecutiveNightControls = Math.max(maxConsecutiveNightControls, currentConsecutiveNightControls);

    return {
        ok: maxConsecutiveNightControls <= 2,
        consecutiveNightControls: maxConsecutiveNightControls
    };
}

/**
 * Vérifie qu'un agent bénéficie d'une période de repos minimale de 48 heures après deux vacations consécutives de contrôle de nuit
 * @param {Object} targetShift - Le shift en question
 * @param {string} targetDate - Date au format YYYY-MM-DD
 * @param {Array} shiftsSorted - Array des shifts triés chronologiquement
 * @returns {Object} { ok: boolean, restAfterTwoNightControls: number }
 */
function checkRestAfterTwoNightControls (targetShift, targetDate, shiftsSorted) {
    if (targetShift.type !== 'work') return { ok: true, restAfterTwoNightControls: 0 };

    const localShiftsSorted = simulateInsertShift(targetShift, targetDate, shiftsSorted);

    // Chercher les séquences de deux vacations de contrôle de nuit consécutives
    let consecutiveNightControls = [];
    let currentSequence = [];
    let currentDate = null;

    for (const shift of localShiftsSorted) {
        if (shift.shift.type === 'work') {
            const shiftStart = parseShiftUTC(shift.date, shift.shift?.default?.startTime);
            const isNightControl = shiftStart.getHours() >= 0 && shiftStart.getHours() < 6;

            if (isNightControl) {
                const shiftDate = new Date(shift.date);

                if (currentDate === null) {
                    currentSequence = [shift];
                    currentDate = shiftDate;
                } else {
                    const daysDiff = Math.floor((shiftDate - currentDate) / (1000 * 60 * 60 * 24));

                    if (daysDiff === 1) {
                        // Jour consécutif
                        currentSequence.push(shift);
                        if (currentSequence.length === 2) {
                            consecutiveNightControls.push([...currentSequence]);
                        }
                    } else if (daysDiff === 0) {
                        // Même jour, on ne compte pas
                        continue;
                    } else {
                        // Jour non consécutif, on réinitialise
                        currentSequence = [shift];
                    }
                    currentDate = shiftDate;
                }
            } else {
                // Shift de jour, on réinitialise le compteur
                currentSequence = [];
                currentDate = null;
            }
        } else {
            // Shift de repos, on réinitialise le compteur
            currentSequence = [];
            currentDate = null;
        }
    }

    // Vérifier le repos après chaque séquence de deux vacations consécutives
    for (const sequence of consecutiveNightControls) {
        if (sequence.length === 2) {
            const lastShiftEnd = parseShiftUTC(sequence[1].date, sequence[1].shift?.default?.endTime, sequence[1].shift?.default?.endsNextDay);

            // Chercher le prochain shift après cette séquence
            let nextShift = null;
            for (const shift of localShiftsSorted) {
                if (shift.shift.type === 'work' && shift.start > lastShiftEnd) {
                    nextShift = shift;
                    break;
                }
            }

            if (nextShift) {
                const restMinutes = (nextShift.start - lastShiftEnd) / (60 * 1000);
                const requiredRestMinutes = 48 * 60; // 48 heures

                if (restMinutes < requiredRestMinutes) {
                    return {
                        ok: false,
                        restAfterTwoNightControls: restMinutes
                    };
                }
            }
        }
    }

    return {
        ok: true,
        restAfterTwoNightControls: 0
    };
}



export {
    categorize,
    checkMinimumRestTime,
    checkWeeklyRestPeriod,
    checkWeeklyWorkHours,
    checkConsecutiveWorkDays,
    checkRestAfterNightControl,
    checkConsecutiveNightControls,
    checkRestAfterTwoNightControls,
    simulateInsertShift
};