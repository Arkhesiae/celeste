/**
 * Génère un tableau de dates YYYY-MM-DD entre deux dates données
 * @param {string} startDate - La date de début
 * @param {string} endDate - La date de fin
 * @returns {Array} - Un tableau de dates
 */
export function generateDateArray (startDate, endDate) {
  const dateArray = [];
  let currentDate = new Date(startDate);
  while (currentDate <= new Date(endDate)) {
    dateArray.push(new Date(currentDate).toISOString().split('T')[0]);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return dateArray;
};

