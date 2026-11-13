import { computeUserShifts } from './planning.userShifts.js';
import { posterDayOf } from '../../utils/dates/dayAccess.js';
import { toPlainDate } from '../../utils/dates/plainDate.js';
import { getEffectiveShiftTimes } from '../../utils/shifts/getEffectiveShiftTimes.js';

import { SHIFT_MAP_DAY_RADIUS } from '../../config/compatibility.js';
/**
 * Prépare une map des shifts pour tous les utilisateurs concernés par les demandes
 * @param {Date[]} dates - Liste de dates à traiter
 * @param {string} userId - ID de l'utilisateur à analyser
 * @returns {Promise<Map<string, { shift: Object, team: Object, date: string, startTime: string, endTime: string, endsNextDay: boolean, selectedVariation: Object|null }>>}
 *   une vacation = le jour où elle commence (clé YYYY-MM-DD) + heures HH:mm du centre (voir utils/shifts/shiftTime.js)
 */
export async function generateShiftsMap (dates, userId) {
  try {
    const userDates = new Set();

    for (const date of dates) {
      const base = toPlainDate(date);
      if (!base) continue;

      for (let offset = -SHIFT_MAP_DAY_RADIUS; offset <= SHIFT_MAP_DAY_RADIUS; offset++) {
        userDates.add(base.add({ days: offset }).toString());
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
        startTime: effectiveTimes.startTime,
        endTime: effectiveTimes.endTime,
        endsNextDay: effectiveTimes.endsNextDay ?? false,
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
  const demandDates = demands.map(d => posterDayOf(d));
  return generateShiftsMap(demandDates, userId);
}

/**
 * Génère une map des shifts à partir d'une seule demande
 * @param {{ posterShift: { date: string } }} demand - Demande
 * @param {string} userId - ID de l'utilisateur à analyser
 * @returns {Promise<Map<string, { shift: Object, team: Object, date: string, start: Date, end: Date }>>}
 */
export async function shiftMapFromSingleDemand (demand, userId) {
  const demandDates = [posterDayOf(demand)];
  return await generateShiftsMap(demandDates, userId);
}

/**
 * Liste des vacations de la map, triées chronologiquement : par jour de début, puis par heure de début (une vacation
 * ne commence jamais le lendemain de son jour, et `HH:mm` se compare comme du texte).
 * @param {Map<string, { shift: Object, team: Object, date: string, startTime: string, endTime: string, endsNextDay: boolean }>} shiftsMap
 * @returns {Array<{ shift: Object, team: Object, date: string, startTime: string, endTime: string, endsNextDay: boolean, selectedVariation: Object|null }>}
 */
export function shiftMapToArray (shiftsMap) {
  return Array.from(shiftsMap.values())
    .map(entry => ({
      shift: entry.shift,
      team: entry.team,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      endsNextDay: entry.endsNextDay ?? false,
      selectedVariation: entry.selectedVariation ?? null
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}
