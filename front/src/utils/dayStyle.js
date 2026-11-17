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
