import { computeUserShifts } from './computeUserShifts.js';
import { parseShiftUTC } from './parseShiftTime.js';
import { getEffectiveShiftTimes } from './getEffectiveShiftTimes.js';

/** Jours avant/après pour couvrir les fenêtres glissantes 7j (±6) + marge nuits / fenêtres étendues */
const SHIFT_MAP_DAY_RADIUS = 12;

/**
 * Prépare une map des shifts pour tous les utilisateurs concernés par les demandes
 * @param {Date[]} dates - Liste de dates à traiter
 * @param {string} userId - ID de l'utilisateur à analyser
 * @returns {Promise<Map<string, { shift: Object, team: Object, date: string, start: Date, end: Date }>>}
 */
export async function generateShiftsMap (dates, userId) {
  try {
    const userDates = new Set();

    for (const date of dates) {
      const base = new Date(date);
      if (Number.isNaN(base.getTime())) continue;
      base.setUTCHours(0, 0, 0, 0);

      for (let offset = -SHIFT_MAP_DAY_RADIUS; offset <= SHIFT_MAP_DAY_RADIUS; offset++) {
        const d = new Date(base);
        d.setUTCDate(d.getUTCDate() + offset);
        userDates.add(d.toISOString().slice(0, 10));
      }
    }

    const dateArray = [...userDates].sort();
    const finalMap = new Map();

    // Un seul passage : charge l'user une fois et traite toutes les dates
    const results = await computeUserShifts(dateArray, userId);

    for (const entry of results) {
      const shift = entry?.shiftData?.shift;
      // Uniquement les vacations travaillées (pas repos / pas off / pas empty)
      if (!shift || shift.type !== 'work' || entry.isOff) continue;

      const dateStr = entry.date;
      const selectedVariation = entry.shiftData?.selectedVariation ?? null;
      const variationObj = (selectedVariation && typeof selectedVariation === 'object'
        && selectedVariation.startTime)
        ? selectedVariation
        : selectedVariation;

      const fromEntry = (entry.startTime && entry.endTime)
        ? {
          startTime: entry.startTime,
          endTime: entry.endTime,
          endsNextDay: getEffectiveShiftTimes(shift, variationObj)?.endsNextDay
            ?? shift.default?.endsNextDay
            ?? false,
        }
        : null;

      const effectiveTimes = getEffectiveShiftTimes(shift, variationObj) ?? fromEntry;

      if (!effectiveTimes?.startTime || !effectiveTimes?.endTime) continue;

      finalMap.set(dateStr, {
        shift,
        team: entry.shiftData?.team ?? null,
        date: dateStr,
        selectedVariation: variationObj,
        start: parseShiftUTC(dateStr, effectiveTimes.startTime, false),
        end: parseShiftUTC(dateStr, effectiveTimes.endTime, effectiveTimes.endsNextDay),
      });
    }

    return finalMap;
  } catch (error) {
    console.error('Erreur dans generateShiftsMap:', error);
    throw error;
  }
}


/**
 * Génère une map des shifts à partir d'un tableau de demandes
 * @param {Array<{ posterShift: { date: string } }>} demands - Tableau de demandes
 * @param {string} userId - ID de l'utilisateur à analyser
 * @returns {Promise<Map<string, { shift: Object, team: Object, date: string, start: Date, end: Date }>>}
 */
export function generateMapFromDemands (demands, userId) {
  const demandDates = demands.map(d => new Date(d.posterShift.date));
  return generateShiftsMap(demandDates, userId);
}

/**
 * Génère une map des shifts à partir d'une seule demande
 * @param {{ posterShift: { date: string } }} demand - Demande
 * @param {string} userId - ID de l'utilisateur à analyser
 * @returns {Promise<Map<string, { shift: Object, team: Object, date: string, start: Date, end: Date }>>}
 */
export async function shiftMapFromSingleDemand (demand, userId) {
  const demandDates = [new Date(demand.posterShift.date)];
  return await generateShiftsMap(demandDates, userId);
}

/**
 * Récupère tous les shifts de type "work", triés chronologiquement
 * @param {Map<string, { shift: Object, team: Object, date: string, start: Date, end: Date }>} shiftsMap
 * @returns {Array<{ shift: Object, date: string, start: Date, end: Date, team: Object }>}
 */
export function shiftMapToArray (shiftsMap) {
  return Array.from(shiftsMap.values())
    .map(entry => ({
      shift: entry.shift,
      date: entry.date,
      start: entry.start,
      end: entry.end,
      team: entry.team,
      selectedVariation: entry.selectedVariation ?? null
    }))
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}
