const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}/;

/**
 * Normalise une date (ISO, YYYY-MM-DD, Date, Temporal, objet date-like) en clé calendrier YYYY-MM-DD.
 * Retourne null si la valeur ne représente pas une date valide.
 * Équivalent backend de front/src/utils/dateKey.js.
 */
export function toDateKey (value) {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    return DATE_KEY_RE.test(value) ? value.slice(0, 10) : null;
  }

  if (typeof value?.toISOString === 'function') {
    try {
      const iso = value.toISOString();
      return DATE_KEY_RE.test(iso) ? iso.slice(0, 10) : null;
    } catch {
      return null; // Date invalide
    }
  }

  const s = value?.toString?.();
  return s && DATE_KEY_RE.test(s) ? s.slice(0, 10) : null;
}
