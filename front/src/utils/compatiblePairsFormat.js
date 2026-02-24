/**
 * Formate les paires de compatibilité (variante fetcher × variantes demande) avec factorisation.
 * - Groupe par ensemble de variantes demande : si (J4, J4A) passent avec SA et SB → "J4, J4A si SA ou SB"
 * - Quand toutes les variantes demande passent : "toutes variantes si SA"
 * - Quand toutes les variantes fetcher passent : "si S" au lieu de "si S ou SA ou SB ou SC"
 * @param {Object} entry - { pairs, baseShiftName, shiftName, totalDemandVariations, totalFetcherVariations }
 * @returns {string}
 */
export function formatPairsForDate({ pairs, baseShiftName, shiftName, totalDemandVariations, totalFetcherVariations }) {
  if (!pairs?.length) return '';

  const fullDemandKey = '__all__';

  /** Groupe : clé = sorted demand names | valeur = liste des noms fetcher */
  const byDemandSet = new Map();

  for (const { fetcherVariation, demandVariations } of pairs) {
    const fetcherFullName = fetcherVariation?.isDefault ? shiftName : shiftName + (fetcherVariation?.name || '');
    const demandNames = (demandVariations || [])
      .map(v => baseShiftName + (v?.name || ''))
      .sort()
      .join(', ');
    const key = demandNames || fullDemandKey;
    const allDemandVariations = totalDemandVariations != null && (demandVariations?.length ?? 0) >= totalDemandVariations;

    if (!byDemandSet.has(key)) {
      byDemandSet.set(key, { demandNames, fetcherNames: [], allDemandVariations });
    }
    const group = byDemandSet.get(key);
    if (!group.fetcherNames.includes(fetcherFullName)) {
      group.fetcherNames.push(fetcherFullName);
    }
  }

  return [...byDemandSet.entries()]
    .map(([, { demandNames, fetcherNames, allDemandVariations }]) => {
      const allFetcherVariations = totalFetcherVariations != null && fetcherNames.length >= totalFetcherVariations;
      if (allFetcherVariations) return ''; // Ne pas afficher : dans tous les cas ce sera le cas
      const demandLabel = allDemandVariations ? 'toutes variantes' : demandNames;
      const fetcherLabel = fetcherNames.length > 1 ? fetcherNames.join(' ou ') : fetcherNames[0] || '';
      if (!demandLabel || !fetcherLabel) return '';
      return `${demandLabel} si ${fetcherLabel}`;
    })
    .filter(Boolean)
    .join(' ; ');
}

/**
 * Formate le label de date relatif (veille, lendemain, ou date courte).
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @param {string} demandDateStr - Date de la demande
 * @returns {string}
 */
export function formatDateLabel(dateStr, demandDateStr) {
  if (!dateStr || !demandDateStr) return '';
  const d = new Date(dateStr);
  const ref = new Date(demandDateStr);
  const diff = Math.round((d - ref) / (24 * 60 * 60 * 1000));
  if (diff === -1) return 'veille';
  if (diff === 1) return 'lendemain';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

/**
 * Construit le suffixe de date pour l'affichage.
 * @param {string} dateLabel - Résultat de formatDateLabel
 * @returns {string} " la veille" | " le lendemain" | " (15 janv.)" | ""
 */
export function formatDateSuffix(dateLabel) {
  if (!dateLabel) return '';
  if (dateLabel === 'veille') return ' la veille';
  if (dateLabel === 'lendemain') return ' le lendemain';
  return ` (${dateLabel})`;
}
