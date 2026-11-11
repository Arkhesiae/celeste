/**
 * Normalise une date (ISO, YYYY-MM-DD, Date, Temporal) en clé calendrier YYYY-MM-DD.
 */
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}/;

/**
 * Normalise une date (ISO, YYYY-MM-DD, Date, Temporal, objet date-like) en clé calendrier YYYY-MM-DD.
 * Retourne null si la valeur ne représente pas une date valide.
 */
export function toDateKey (value) {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    return DATE_KEY_RE.test(value) ? value.slice(0, 10) : null;
  }

  // Couvre Date natif + tout objet date-like (Moment, Day.js, Temporal, Date d'une autre realm)
  if (typeof value?.toISOString === 'function') {
    try {
      const iso = value.toISOString();
      return DATE_KEY_RE.test(iso) ? iso.slice(0, 10) : null;
    } catch {
      return null;
    }
  }

  const s = value?.toString?.();
  return s && DATE_KEY_RE.test(s) ? s.slice(0, 10) : null;
}

/**
 * Jour choisi dans un sélecteur de date (Vuetify rend un `Date` à minuit LOCAL, ou une chaîne) -> clé YYYY-MM-DD du jour
 * affiché. Un `toISOString()` décalerait d'un jour dans un fuseau à l'est de l'UTC.
 */
export function pickerDayKey (value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return toDateKey(value);
}

export function sameDateKey (a, b) {
  const ka = toDateKey(a);
  const kb = toDateKey(b);
  return Boolean(ka && kb && ka === kb);
}

/** Compare des ids Mongo (string | ObjectId | {_id}) */
export function sameId (a, b) {
  const idOf = (v) => {
    if (v == null) return null;
    if (typeof v === 'object' && v._id != null) return String(v._id);
    return String(v);
  };
  const ia = idOf(a);
  const ib = idOf(b);
  return Boolean(ia && ib && ia === ib);
}
