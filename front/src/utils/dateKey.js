/**
 * Normalise une date (ISO, YYYY-MM-DD, Date, Temporal) en clé calendrier YYYY-MM-DD.
 */
export function toDateKey (value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value?.toISOString === 'function') {
    try {
      return value.toISOString().slice(0, 10);
    } catch {
      /* fall through */
    }
  }
  if (typeof value?.toString === 'function') {
    const s = value.toString();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  }
  return null;
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
