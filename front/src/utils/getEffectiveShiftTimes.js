/**
 * Retourne le nom à afficher pour une vacation : "nomShift" + "nomVariante" si variante sélectionnée (ex: J4B).
 * Un agent remplacé ne tient plus de vacation : on affiche celle qu'il a cédée (`substitution.gave`), que l'écran barre.
 * @param {Object} vacation - un jour de `computeUserShifts` : { shiftData, presence, substitution }, ou { shift, selectedVariation }
 * @returns {string}
 */
export function getDisplayShiftName(vacation) {
  if (!vacation) return '';

  const gave = vacation.presence === 'replaced' ? vacation.substitution?.gave : null;
  const shift = vacation.shiftData?.shift || vacation.shift || gave?.shift;
  const selectedVariation =
    vacation.shiftData?.selectedVariation ?? vacation.selectedVariation ?? gave?.selectedVariation;
  if (!shift) return '';

  const baseName = shift.name || '';
  if (selectedVariation) {
    if (typeof selectedVariation === 'object' && selectedVariation?.name) {
      return baseName + selectedVariation.name;
    }
    if (shift.variations?.length > 0) {
      const variationId = (selectedVariation._id || selectedVariation)?.toString?.() || selectedVariation?.toString?.();
      const variation = shift.variations.find((v) => (v._id || v)?.toString?.() === variationId);
      if (variation?.name) return baseName + variation.name;
    }
  }
  return baseName;
}

/**
 * Retourne les horaires effectifs d'un shift en tenant compte de la variante sélectionnée.
 * @param {Object} shift - Le shift avec default et potentiellement variations
 * @param {Object|string|null} selectedVariation - La variante sélectionnée
 * @returns {{ startTime: string, endTime: string, endsNextDay: boolean } | null}
 */
export function getEffectiveShiftTimes(shift, selectedVariation = null) {
  if (!shift?.default) return null;

  const defaultTimes = shift.default;
  if (!defaultTimes.startTime || !defaultTimes.endTime) return null;

  if (selectedVariation) {
    // selectedVariation peuplé (objet avec startTime/endTime) → utiliser directement
    if (typeof selectedVariation === 'object' && selectedVariation?.startTime && selectedVariation?.endTime) {
      return {
        startTime: selectedVariation.startTime,
        endTime: selectedVariation.endTime,
        endsNextDay: selectedVariation.endsNextDay ?? false,
      };
    }
    // Sinon chercher dans shift.variations
    if (shift.variations?.length > 0) {
      const variationId = (selectedVariation._id || selectedVariation)?.toString?.() || selectedVariation?.toString?.();
      const variation = shift.variations.find((v) => (v._id || v)?.toString?.() === variationId);
      if (variation?.startTime && variation?.endTime) {
        return {
          startTime: variation.startTime,
          endTime: variation.endTime,
          endsNextDay: variation.endsNextDay ?? false,
        };
      }
    }
  }

  return {
    startTime: defaultTimes.startTime,
    endTime: defaultTimes.endTime,
    endsNextDay: defaultTimes.endsNextDay ?? false,
  };
}
