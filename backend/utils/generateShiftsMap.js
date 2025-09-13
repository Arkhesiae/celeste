import { computeShiftOfUserWithSubstitutions } from './computeShiftOfUserWithSubstitutions.js';
import { parseShiftTime } from './parseShiftTime.js';



/**
 * Prépare une map des shifts pour tous les utilisateurs concernés par les demandes
 * @param {Date[]} dates - Liste de dates à traiter
 * @param {string} userId - ID de l'utilisateur à analyser
 * @returns {Promise<Map<string, { shift: Object, team: Object, date: string, start: Date, end: Date }>>}
 */
export async function generateShiftsMap(dates, userId) {
  try {
    const shiftsMap = new Map();

    // Construire un ensemble de dates ±6 jours autour de chaque date
    const userDates = new Set(
      dates.flatMap(date => {
        const base = date.toISOString().split('T')[0];
        const before = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(date);
          d.setDate(date.getDate() - (i + 1));
          return d.toISOString().split('T')[0];
        });
        const after = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(date);
          d.setDate(date.getDate() + (i + 1));
          return d.toISOString().split('T')[0];
        });
        return [base, ...before, ...after];
      })
    );

    const dateArray = Array.from(userDates).sort();

    // Récupérer tous les shifts en parallèle
    await Promise.all(
      dateArray.map(async (date) => {
        const shifts = await computeShiftOfUserWithSubstitutions(date, userId);
        for (const shift of shifts) {
          shiftsMap.set(shift.date, shift);
        }
      })
    );

    // Construire la map finale (filtrer uniquement les shifts "work")
    const finalMap = new Map();
    for (const [date, entry] of shiftsMap) {
      if (!entry.shift || entry.shift?.type !== 'work') continue;

      const { shift, teamObject } = entry;
      const { startTime, endTime, endsNextDay } = shift?.default || {};

      const start = parseShiftTime(date, startTime);
      const end = parseShiftTime(date, endTime, endsNextDay);

      finalMap.set(date, { shift, team: teamObject, date, start, end });
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
export function generateMapFromDemands(demands, userId) {
  const demandDates = demands.map(d => new Date(d.posterShift.date));
  return generateShiftsMap(demandDates, userId); // pas besoin de `await` ici
}

/**
 * Récupère tous les shifts de type "work", triés chronologiquement
 * @param {Map<string, { shift: Object, team: Object, date: string, start: Date, end: Date }>} shiftsMap
 * @returns {Array<{ shift: Object, date: string, start: Date, end: Date, team: Object }>}
 */
export function shiftMapToArray(shiftsMap) {
  return Array.from(shiftsMap.values())
    .map(entry => ({
      shift: entry.shift,
      date: entry.date,
      start: entry.start,
      end: entry.end,
      team: entry.team
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}
