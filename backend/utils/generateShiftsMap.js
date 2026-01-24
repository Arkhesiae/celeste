import { computeShiftOfUserWithSubstitutions } from './computeShiftOfUserWithSubstitutions.js';
import { parseShiftUTC } from './parseShiftTime.js';



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
      const baseTime = date.getTime();

      for (let offset = -6; offset <= 6; offset++) {
        const d = new Date(baseTime);
        d.setDate(d.getDate() + offset);
        userDates.add(d.toISOString().slice(0, 10));
      }
    }

    const dateArray = [...userDates].sort();

    const finalMap = new Map();

    await Promise.all(
      dateArray.map(date =>
        computeShiftOfUserWithSubstitutions(date, userId).then(shifts =>
          shifts
            .filter(s => s.shift?.type === 'work')
            .forEach(({ shift, teamObject, date }) => {
              const { startTime, endTime, endsNextDay } = shift.default ?? {};
              finalMap.set(date, {
                shift,
                team: teamObject,
                date,
                start: parseShiftUTC(date, startTime),
                end: parseShiftUTC(date, endTime, endsNextDay)
              });
            })
        )
      )
    );


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
