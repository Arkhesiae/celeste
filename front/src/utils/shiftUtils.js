/**
 * Utilitaires pour la gestion des shifts
 * @module shiftUtils
 */

/**
 * Calcule le délai de repos entre deux shifts
 * @param {Object} shift1 - Premier shift avec startTime et endTime
 * @param {Object} shift2 - Deuxième shift avec startTime et endTime
 * @returns {number} Délai de repos en heures
 */
export function calculateRestDelay(shift1, shift2) {
  if (!shift1 || !shift2) return 0;
  
  const shift1End = new Date(`2000-01-01 ${shift1.endTime}`);
  const shift2Start = new Date(`2000-01-02 ${shift2.startTime}`);
  
  if (shift1.endsNextDay) {
    shift1End.setDate(shift1End.getDate() + 1);
  }
  
  // Calculer la différence en heures
  const diffHours = (shift2Start - shift1End) / (1000 * 60 * 60);
  return diffHours;
} 