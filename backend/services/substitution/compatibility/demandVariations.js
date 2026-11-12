/**
 * Exploration des variantes ambiguës et compatibilité « potentielle » d'une demande — OPTIONNEL, désactivé par défaut.
 *
 * Contexte. Une vacation peut avoir des variantes (autres horaires). Tant que personne n'en choisit une, les calculs
 * de compatibilité (categorizeDemand.js) supposent les horaires PAR DÉFAUT du shift ; dès qu'une variante est choisie
 * (par le demandeur sur la demande, par l'utilisateur dans son calendrier), elle est prise en compte. Rien de plus.
 *
 * Ce fichier va plus loin : pour les vacations dont la variante n'est pas choisie, il essaie TOUTES les variantes et
 * dit lesquelles rendraient la demande compatible (aide à la décision : « compatible si vous prenez la variante B »).
 * L'intégration est incomplète (le front l'affiche en partie, voir docs/architecture/demand-categorization.md), et le
 * calcul est coûteux (produit de combinaisons, borné) : il n'est donc exécuté que sur demande.
 *
 * Activation :
 *   - par appel : `categorizeWithVariations(demand, shiftsMap, { explore: true })` ;
 *   - par défaut : variable d'environnement EXPLORE_VARIATIONS=true (sinon l'exploration est ignorée).
 *
 * Champs ajoutés au résultat de `categorize` : compatibleVariations, compatibleFetcherVariationsByDate,
 * compatiblePairsByFetcherDate, potentiallyCompatible, et `variationsExplored` (false = ces champs sont vides parce que
 * l'exploration n'a pas eu lieu, pas parce qu'aucune variante ne convient).
 */
import { posterDayOf } from '../../../utils/dates/dayAccess.js';
import { daysBetween } from '../../../utils/dates/plainDate.js';
import { getEffectiveShiftTimes } from '../../../utils/shifts/getEffectiveShiftTimes.js';
import { DEFAULT_TIME_ZONE } from '../../../utils/dates/constants.js';
import { categorize, checkCompatibilityForVariation, buildPreFetchedAcceptedShifts } from './categorizeDemand.js';

import { MAX_COMPATIBILITY_COMBOS, AMBIGUOUS_DAY_RADIUS, MAX_AMBIGUOUS_DATES } from '../../../config/compatibility.js';
/** Résultat quand l'exploration n'a pas eu lieu : mêmes champs, vides */
const NOT_EXPLORED = Object.freeze({
    compatibleVariations: [],
    compatibleFetcherVariationsByDate: [],
    compatiblePairsByFetcherDate: [],
    potentiallyCompatible: false,
    variationsExplored: false,
});

/** Valeur par défaut du drapeau : variable d'environnement EXPLORE_VARIATIONS=true */
const explorationEnabledByDefault = () => process.env.EXPLORE_VARIATIONS === 'true';

/** Identifiant d'une variante (objet peuplé, id, ou null = horaires par défaut → 'default') */
const variationKey = (variation) => (variation?._id || variation)?.toString?.() ?? 'default';

/**
 * Variante concrète déjà choisie par l'utilisateur pour une de ses vacations (ni 'vic' / 'disp', ni vide).
 * Si c'est le cas, ses horaires sont connus : on ne ré-explore pas les variantes de ce jour.
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

/**
 * Jours « ambigus » du planning de l'utilisateur : vacation à au moins 2 variantes, sans variante choisie, assez près
 * de la demande pour influencer ses fenêtres de repos. On garde les plus proches, dans la limite MAX_AMBIGUOUS_DATES.
 *
 * @param {Map<string, Object>} shiftsMap - planning de l'utilisateur, par jour YYYY-MM-DD
 * @param {string} demandDateStr - jour de la demande
 * @returns {string[]} jours ambigus, du plus proche au plus éloigné
 */
function selectAmbiguousFetcherDates (shiftsMap, demandDateStr) {
    const candidates = [];
    for (const [dateStr, entry] of shiftsMap) {
        if (entry?.shift?.variations?.length < 2) continue;
        if (hasConcreteFetcherVariation(entry.selectedVariation)) continue;
        const diff = Math.abs(daysBetween(dateStr, demandDateStr));
        if (diff > AMBIGUOUS_DAY_RADIUS) continue;
        candidates.push({ dateStr, diff });
    }
    candidates.sort((a, b) => a.diff - b.diff || a.dateStr.localeCompare(b.dateStr));
    return candidates.slice(0, MAX_AMBIGUOUS_DATES).map((c) => c.dateStr);
}

/**
 * Toutes les façons de choisir une variante (ou l'horaire par défaut, `null`) pour chaque jour ambigu : un produit
 * cartésien, borné pour ne jamais construire une liste géante. Chaque combinaison est un objet { jour: variante|null }.
 *
 * Exemple : 2 jours ambigus ayant 2 variantes chacun → 3 × 3 = 9 combinaisons (défaut, A, B par jour).
 *
 * @param {string[]} ambiguousDates - jours ambigus
 * @param {Map<string, Object>} shiftsMap - planning de l'utilisateur
 * @param {number} maxCombos - arrêt dès que ce nombre est atteint (les suivantes ne sont simplement pas évaluées)
 * @returns {Array<{ [dateStr: string]: Object|null }>}
 */
function getFetcherVariationCombinations (ambiguousDates, shiftsMap, maxCombos = MAX_COMPATIBILITY_COMBOS) {
    if (ambiguousDates.length === 0) return [{}];

    const variationsByDate = ambiguousDates.map((d) => {
        const vars = shiftsMap.get(d)?.shift?.variations;
        if (!vars || vars.length === 0) return [null];
        return [null, ...vars];
    });

    const result = [];
    // Parcours en profondeur : on fixe la variante du jour `idx`, puis on descend au jour suivant
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
 * Copie de la map du planning où les vacations des jours ambigus prennent la variante choisie par l'exploration
 * (`overrides` : { [jour]: variante }). Le jour de la demande n'est jamais modifié : c'est la vacation de la demande
 * qui s'y pose.
 */
function withFetcherOverrides (shiftsMap, demandDateStr, overrides = {}) {
    const localMap = new Map();
    for (const [dateStr, entry] of shiftsMap) {
        const override = dateStr === demandDateStr ? null : overrides[dateStr];
        const effectiveTimes = override && entry?.shift ? getEffectiveShiftTimes(entry.shift, override) : null;
        if (effectiveTimes) {
            localMap.set(dateStr, {
                ...entry,
                startTime: effectiveTimes.startTime,
                endTime: effectiveTimes.endTime,
                endsNextDay: effectiveTimes.endsNextDay ?? false,
            });
        } else {
            localMap.set(dateStr, entry);
        }
    }
    return localMap;
}

/**
 * Cas A — la demande n'a PAS de variante choisie : quelles variantes de la vacation demandée conviennent, et avec
 * quelle variante de chaque vacation ambiguë de l'utilisateur ?
 *
 * @param {Object} shift - le shift demandé (avec ses variantes)
 * @param {Set<string>} compatibleDemandVariationIds - variantes de la demande qui passent dans au moins une combinaison
 * @param {Map<string, Map<string, Set<string>>>} pairs - jour ambigu → variante de l'utilisateur → variantes de la demande
 * @param {string[]} ambiguousFetcherDates
 * @param {Map<string, Object>} shiftsMap
 * @returns {{ compatibleVariations: Array, compatiblePairsByFetcherDate: Array }}
 */
function summarizeDemandVariations (shift, compatibleDemandVariationIds, pairs, ambiguousFetcherDates, shiftsMap) {
    const variations = shift.variations || [];
    const result = {
        compatibleVariations: variations
            .filter(v => compatibleDemandVariationIds.has(variationKey(v)))
            .map(v => ({ _id: v._id || v, name: v?.name, startTime: v?.startTime, endTime: v?.endTime })),
        compatiblePairsByFetcherDate: [],
    };
    if (pairs.size === 0) return result;

    const baseShiftName = shift?.name || '';
    result.compatiblePairsByFetcherDate = ambiguousFetcherDates.map(dateStr => {
        const entry = shiftsMap.get(dateStr);
        const pairsMap = pairs.get(dateStr);
        if (!entry?.shift || !pairsMap) return null;

        const demandVariationsFor = (key) => variations
            .filter(v => pairsMap.get(key).has(variationKey(v)))
            .map(v => ({ _id: v._id || v, name: v?.name }));
        const pairsOfDay = [];
        if (pairsMap.has('default')) {
            const demandVariations = demandVariationsFor('default');
            if (demandVariations.length > 0) pairsOfDay.push({ fetcherVariation: { name: '', isDefault: true }, demandVariations });
        }
        for (const fv of entry.shift?.variations || []) {
            const key = variationKey(fv);
            if (!pairsMap.has(key)) continue;
            const demandVariations = demandVariationsFor(key);
            if (demandVariations.length > 0) pairsOfDay.push({ fetcherVariation: { _id: fv._id || fv, name: fv?.name, isDefault: false }, demandVariations });
        }
        if (pairsOfDay.length === 0) return null;

        // Si TOUTES les combinaisons conviennent, il n'y a rien à signaler pour ce jour
        const totalFetcherOptions = 1 + (entry.shift?.variations?.length || 0);
        const allDemandPass = pairsOfDay.every(p => p.demandVariations.length >= variations.length);
        if (pairsOfDay.length >= totalFetcherOptions && allDemandPass) return null;

        return {
            date: dateStr,
            shiftName: entry.shift?.name || '',
            baseShiftName,
            totalDemandVariations: variations.length,
            totalFetcherVariations: totalFetcherOptions,
            pairs: pairsOfDay,
        };
    }).filter(Boolean);
    return result;
}

/**
 * Cas B — la demande A une variante choisie : quelles variantes de chaque vacation ambiguë de l'utilisateur rendent
 * la demande compatible ? (Un jour où toutes les variantes conviennent n'est pas signalé.)
 *
 * @param {Map<string, Set<string>>} compatibleFetcherByDate - jour ambigu → variantes de l'utilisateur qui passent
 * @param {string[]} ambiguousFetcherDates
 * @param {Map<string, Object>} shiftsMap
 * @returns {Array<{ date: string, shiftName: string, variations: Array }>}
 */
function summarizeFetcherVariations (compatibleFetcherByDate, ambiguousFetcherDates, shiftsMap) {
    return ambiguousFetcherDates.map(dateStr => {
        const entry = shiftsMap.get(dateStr);
        const passingIds = compatibleFetcherByDate.get(dateStr);
        const totalOptions = 1 + (entry?.shift?.variations?.length || 0);   // défaut + variantes
        if (!entry?.shift || !passingIds || passingIds.size >= totalOptions) return null;

        const variations = [];
        if (passingIds.has('default')) variations.push({ name: '', isDefault: true });
        for (const v of entry.shift?.variations || []) {
            if (passingIds.has(variationKey(v))) variations.push({ _id: v._id || v, name: v?.name, isDefault: false });
        }
        return { date: dateStr, shiftName: entry.shift?.name || '', variations };
    }).filter(Boolean);
}

/**
 * Explore les variantes ambiguës de la demande et des vacations de l'utilisateur.
 *
 * Déroulé :
 *   1. jours ambigus du planning de l'utilisateur (selectAmbiguousFetcherDates) ;
 *   2. variantes de la demande à essayer : toutes si aucune n'est choisie (cas A), sinon la variante choisie (cas B) ;
 *   3. pour chaque (variante de la demande × combinaison de variantes de l'utilisateur), on refait le calcul de
 *      compatibilité complet (checkCompatibilityForVariation) sur une copie modifiée du planning ;
 *   4. on retient ce qui passe, et `potentiallyCompatible` = certaines combinaisons passent ET d'autres échouent
 *      (« compatible selon la variante choisie »).
 *
 * @param {Object} demand - la demande
 * @param {Map<string, Object>} shiftsMap - planning de l'utilisateur
 * @param {string} [timeZone] - fuseau du centre de l'utilisateur (le même que celui du planning)
 * @returns {Promise<{ compatibleVariations: Array, compatibleFetcherVariationsByDate: Array, compatiblePairsByFetcherDate: Array, potentiallyCompatible: boolean }>}
 */
async function exploreVariations (demand, shiftsMap, timeZone = DEFAULT_TIME_ZONE) {
    const out = {
        compatibleVariations: [],
        compatibleFetcherVariationsByDate: [],
        compatiblePairsByFetcherDate: [],
        potentiallyCompatible: false,
    };
    const demandDateStr = posterDayOf(demand);
    const shift = demand.posterShift?.shift;
    const hasVariations = shift?.variations?.length >= 2;
    const noSelectedVariation = !demand.posterShift?.selectedVariation;
    const preFetchedAcceptedShifts = await buildPreFetchedAcceptedShifts(demand);

    // 1. Jours ambigus, proches de la demande uniquement (évite l'explosion sur toute la fenêtre de ±12 jours)
    const ambiguousFetcherDates = selectAmbiguousFetcherDates(shiftsMap, demandDateStr);

    // 2. Variantes de la demande à essayer
    const demandVariationsToTry = (hasVariations && noSelectedVariation)
        ? (shift.variations || [])
        : [demand.posterShift?.selectedVariation ?? null];

    // Le budget d'évaluations est partagé entre les variantes de la demande
    const maxFetcherCombos = Math.max(1, Math.floor(MAX_COMPATIBILITY_COMBOS / Math.max(1, demandVariationsToTry.length)));
    const combosToIterate = getFetcherVariationCombinations(ambiguousFetcherDates, shiftsMap, maxFetcherCombos);

    // 3. Évaluation de chaque combinaison
    let anyPass = false;
    let anyFail = false;
    const compatibleDemandVariationIds = new Set();
    /** Cas B : jour ambigu → variantes de l'utilisateur qui font passer au moins une combinaison */
    const compatibleFetcherByDate = new Map();
    /** Cas A : jour ambigu → variante de l'utilisateur → variantes de la demande qui passent avec elle */
    const compatiblePairsByFetcherDate = new Map();

    for (const demandVar of demandVariationsToTry) {
        for (const fetcherCombo of combosToIterate) {
            const planning = withFetcherOverrides(shiftsMap, demandDateStr, fetcherCombo);
            const vr = checkCompatibilityForVariation(demand, planning, demandVar, preFetchedAcceptedShifts, timeZone);
            if (vr.limit.length > 0) {
                anyFail = true;
                continue;
            }

            anyPass = true;
            if (hasVariations && noSelectedVariation && demandVar) {
                compatibleDemandVariationIds.add(variationKey(demandVar));
                for (const d of ambiguousFetcherDates) {
                    const fetcherKey = variationKey(fetcherCombo[d]);
                    if (!compatiblePairsByFetcherDate.has(d)) compatiblePairsByFetcherDate.set(d, new Map());
                    if (!compatiblePairsByFetcherDate.get(d).has(fetcherKey)) compatiblePairsByFetcherDate.get(d).set(fetcherKey, new Set());
                    compatiblePairsByFetcherDate.get(d).get(fetcherKey).add(variationKey(demandVar));
                }
            }
            if (!noSelectedVariation) {
                for (const d of ambiguousFetcherDates) {
                    if (!compatibleFetcherByDate.has(d)) compatibleFetcherByDate.set(d, new Set());
                    compatibleFetcherByDate.get(d).add(variationKey(fetcherCombo[d]));
                }
            }
        }
    }

    // 4. Résumé pour l'affichage
    if (hasVariations && noSelectedVariation) {
        Object.assign(out, summarizeDemandVariations(shift, compatibleDemandVariationIds, compatiblePairsByFetcherDate, ambiguousFetcherDates, shiftsMap));
    }
    if (!noSelectedVariation && compatibleFetcherByDate.size > 0) {
        out.compatibleFetcherVariationsByDate = summarizeFetcherVariations(compatibleFetcherByDate, ambiguousFetcherDates, shiftsMap);
    }
    out.potentiallyCompatible = anyPass && anyFail;
    return out;
}

/**
 * `categorize` (compatibilité de base : horaires par défaut, ou variante choisie) + exploration optionnelle des variantes.
 *
 * À utiliser quand le résultat est AFFICHÉ (cartes de demande), jamais pour décider qui reçoit une demande (pool).
 *
 * @param {Object} demand - document de demande
 * @param {Map<string, Object>} shiftsMap - planning de l'utilisateur
 * @param {{ explore?: boolean, selectedVariation?: Object|string|null, timeZone?: string }} [options]
 *   - `explore` : lance l'exploration (défaut : variable d'environnement EXPLORE_VARIATIONS) ;
 *   - `selectedVariation` : variante choisie par l'utilisateur qui consulte (voir `categorize`) ;
 *   - `timeZone` : fuseau du centre de l'utilisateur (voir `categorize`).
 * @returns {Promise<Object>} le résultat de `categorize` + les champs de variantes + `variationsExplored`
 */
const categorizeWithVariations = async (demand, shiftsMap = null, options = {}) => {
    const { explore = explorationEnabledByDefault(), ...categorizeOptions } = options;
    const base = await categorize(demand, shiftsMap, categorizeOptions);
    if (!explore) return { ...base, ...NOT_EXPLORED };
    return { ...base, ...(await exploreVariations(demand, shiftsMap, categorizeOptions.timeZone ?? DEFAULT_TIME_ZONE)), variationsExplored: true };
};

export { categorizeWithVariations, exploreVariations };
