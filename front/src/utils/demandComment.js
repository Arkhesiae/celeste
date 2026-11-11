/**
 * Marqueur technique des demandes seed (champ comment).
 * Ce n'est PAS un commentaire saisi par un agent.
 */
export function isSeedComment (comment) {
  return typeof comment === 'string' && comment.trimStart().startsWith('[seed]');
}

/**
 * Affiche uniquement les vrais commentaires agents.
 * Les marqueurs [seed]… ne sont jamais montrés comme commentaire.
 */
export function canSeeDemandComment (comment) {
  return Boolean(getVisibleDemandComment(comment));
}

/**
 * Texte du commentaire agent à afficher, ou '' si vide / marqueur seed.
 */
export function getVisibleDemandComment (comment) {
  if (comment == null) return '';
  const text = String(comment).trim();
  if (!text) return '';
  if (isSeedComment(text)) return '';
  return text;
}
