/**
 * Identifiants Mongo : comparaison et validation, au même endroit.
 *
 * Un id peut arriver sous plusieurs formes selon d'où il vient : ObjectId, chaîne, ou document peuplé (`{ _id }`).
 * Les comparer avec `===` ou `.toString() ===` est une source d'erreurs (ObjectId différents de même valeur,
 * `.toString()` sur null) : on passe par `sameId`.
 */

/** Id sous forme de chaîne, que la valeur soit un ObjectId, une chaîne ou un document peuplé */
export const idOf = (value) => String(value?._id ?? value);

/** Deux ids désignent-ils la même ressource ? Faux si l'un des deux est absent (jamais d'exception). */
export const sameId = (a, b) => a != null && b != null && idOf(a) === idOf(b);

/** La valeur a-t-elle la forme d'un ObjectId (24 caractères hexadécimaux) ? */
export const isValidId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
