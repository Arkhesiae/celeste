/**
 * Retourne les horaires effectifs d'un shift en tenant compte de la variante sélectionnée.
 * Si une variante est sélectionnée et existe dans le shift, on utilise ses horaires.
 * Sinon, on utilise shift.default.
 *
 * @param {Object} shift - Le shift (jour) avec default et potentiellement variations
 * @param {Object|string|null} selectedVariation - La variante sélectionnée (objet ou ObjectId)
 * @returns {{ startTime: string, endTime: string, endsNextDay: boolean } | null}
 */
export function getEffectiveShiftTimes(shift, selectedVariation = null) {
  if (!shift) return null;

  const defaultTimes = shift.default;
  if (!defaultTimes || !defaultTimes.startTime || !defaultTimes.endTime) return null;

  if (selectedVariation && shift.variations?.length > 0) {
    const variationId = typeof selectedVariation === 'object' && selectedVariation !== null
      ? selectedVariation._id?.toString?.() || selectedVariation.toString?.()
      : selectedVariation?.toString?.();

    const variation = shift.variations.find((v) => {
      const vId = (v._id || v)?.toString?.();
      return vId === variationId;
    });

    if (variation && variation.startTime && variation.endTime) {
      return {
        startTime: variation.startTime,
        endTime: variation.endTime,
        endsNextDay: variation.endsNextDay ?? false
      };
    }
  }

  return {
    startTime: defaultTimes.startTime,
    endTime: defaultTimes.endTime,
    endsNextDay: defaultTimes.endsNextDay ?? false
  };
}
