import { computeShiftOfUserWithSubstitutions } from './computeShiftOfUserWithSubstitutions.js';

/**
 * Prépare une map des shifts pour tous les utilisateurs concernés par les demandes
 * @param {Array} demands - Liste des demandes à traiter
 * @param {string} userId - ID de l'utilisateur à analyser
 * @returns {Map} Map avec clé "date" et valeur { shift, team, date, start, end }
 */
const generateShiftsMap = async (demands, userId) => {
    try {
    const shiftsMap = new Map();

    // Collecter toutes les dates uniques pour l'utilisateur
    const userDates = new Set();

    for (const demand of demands) {
        const demandDate = new Date(demand.posterShift.date);

        // Ajouter le jour de la demande
        userDates.add(demandDate.toISOString().split('T')[0]);

        // Ajouter 6 jours avant
        for (let i = 1; i <= 6; i++) {
            const beforeDate = new Date(demandDate);
            beforeDate.setDate(demandDate.getDate() - i);
            userDates.add(beforeDate.toISOString().split('T')[0]);
        }

        // Ajouter 6 jours après
        for (let i = 1; i <= 6; i++) {
            const afterDate = new Date(demandDate);
            afterDate.setDate(demandDate.getDate() + i);
            userDates.add(afterDate.toISOString().split('T')[0]);
        }
    }

    const dates = Array.from(userDates).sort();
    // Calculer tous les shifts en parallèle
    const promises = [];

    for (const date of dates) {
        promises.push(
            computeShiftOfUserWithSubstitutions(date, userId)
                .then(shifts => {
                    for (const shift of shifts) {
                        const key = `${shift.date}`;
                        shiftsMap.set(key, shift);
                    }
                })
        );
    }

    await Promise.all(promises);
    
    // Créer la Map finale avec les résultats traités
    const finalMap = new Map();
    
    for (const [date, entry] of shiftsMap) {
        if (!entry.shift || entry.shift?.type !== 'work') continue;

        const shift = entry.shift;
        let startTime = shift?.default?.startTime;
        let endTime = shift?.default?.endTime;
        const start = parseShiftDateTime(date, startTime);
        const end = parseShiftDateTime(date, endTime, shift?.default?.endsNextDay);

        finalMap.set(date, { shift, team: entry.teamObject, date, start, end });
    }

        return finalMap;
    } catch (error) {
        console.error('Erreur dans generateShiftsMap:', error.message);
        throw error;
    }
};

/**
 * Parse un horaire de shift en Date JS complète
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} time - Heure au format HH:mm
 * @param {boolean} endsNextDay - Si true, décale au lendemain
 * @returns {Date}
 */
function parseShiftDateTime(date, time, endsNextDay = false) {
    const [hour, minute] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(hour, minute, 0, 0);
    if (endsNextDay) d.setDate(d.getDate() + 1);
    return d;
}


export { generateShiftsMap };