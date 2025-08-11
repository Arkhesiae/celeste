/**
 * Parse un horaire de shift en Date JS complète
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} time - Heure au format HH:mm
 * @param {boolean} endsNextDay - Si true, décale au lendemain
 * @returns {Date}
 */
export function parseShiftDateTime(date, time, endsNextDay = false) {
    const [hour, minute] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(hour, minute, 0, 0);
    if (endsNextDay) d.setDate(d.getDate() + 1);
    return d;
}