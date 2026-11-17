import { entryTypeOf } from '@/utils/entryIcons';

/**
 * Code couleur commun des jours (calendrier, grille d'équipe) : les classes sont définies une fois dans styles/day.css, ce
 * fichier calcule laquelle poser.
 */

/**
 * Nature d'un jour : `leave` (congé), `entry` (autre affectation), `vic`, `work`, `rest`, ou `null` (rien à colorer).
 * @param {{ type?: string, shiftType?: string|null, variation?: unknown }} day
 *   type : `shift`, `empty` ou le type de l'affectation (`absence`, `training`...) ; shiftType : `work` ou `rest` de la
 *   vacation montrée (la cédée pour un remplacé) ; variation : la variante choisie, `'vic'` pour un VIC
 */
export function dayKindOf({ type, shiftType = null, variation = null } = {}) {
  if (entryTypeOf(type)) return type === 'absence' ? 'leave' : 'entry';
  if (shiftType === 'work') return variation === 'vic' ? 'vic' : 'work';
  if (shiftType === 'rest') return 'rest';
  return null;
}

/**
 * Nature d'un jour d'après son entrée dans la store des vacations (`shiftStore.persistentVacationsMap`) ; `null` si le jour n'y est pas.
 * Remplacé, l'agent ne tient plus de vacation : on prend celle qu'il a cédée, comme le calendrier.
 */
export function dayKindOfEntry(entry) {
  if (!entry) return null;
  const shown = entry.shiftData?.shift ?? (entry.presence === 'replaced' ? entry.substitution?.gave?.shift : null);
  return dayKindOf({ type: entry.type, shiftType: shown?.type, variation: entry.shiftData?.selectedVariation });
}

/** Libellé de la nature d'un jour, pour les infobulles (la couleur ne dit jamais seule) */
export const DAY_KIND_LABELS = { work: 'vacation', vic: 'VIC', leave: 'congé', entry: 'affectation', rest: 'repos' };

/** Classe de la nature d'un jour (`day--work`...), vide sans nature */
export const dayKindClass = (kind) => (kind ? `day--${kind}` : '');

/**
 * Classes de présence : atténué dès que l'agent n'est pas présent ; en couleur d'erreur pour une dispo ou un jour facultatif
 * non confirmé (un remplacé est atténué sans être « absent »).
 * @param {'present'|'released'|'unconfirmed'|'replaced'} [presence]
 */
export function dayPresenceClasses(presence = 'present') {
  if (presence === 'present') return [];
  return presence === 'released' || presence === 'unconfirmed'
    ? ['day-presence--away', 'day-presence--absent']
    : ['day-presence--away'];
}
