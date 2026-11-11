import { Temporal } from '@js-temporal/polyfill';
import { toDateKey } from './dateKey.js';

/**
 * Jours reçus de l'API, dans les deux formats pendant la migration `Date` -> `YYYY-MM-DD`.
 *
 * Chaque ancien champ-date (`posterShift.date`, `fromDate`, `toDate`, `birthDate`...) a un jumeau « jour »
 * (`posterShift.day`, `fromDay`, `toDay`, `birthDay`...). Ces fonctions lisent le jumeau s'il existe, sinon l'ancien champ
 * (ISO ou YYYY-MM-DD), et rendent toujours une clé `YYYY-MM-DD` ou null : le reste du code compare des clés, jamais des
 * `Date` ni des chaînes ISO. Le jour où l'API ne renverra plus que les jumeaux, seul ce fichier change.
 */

/** Clé de jour : le jumeau s'il est présent, sinon l'ancien champ */
// TEMPORARY(day-fields): le repli sur l'ancien champ (second argument) disparait a la bascule : lire le jumeau seul.
export const dayOf = (twin, legacy) => toDateKey(twin) ?? toDateKey(legacy);

/** Jour d'un `posterShift` / `accepterShift` */
export const shiftDay = (shift) => dayOf(shift?.day, shift?.date);
export const posterDay = (substitution) => shiftDay(substitution?.posterShift);
export const accepterDay = (substitution) => shiftDay(substitution?.accepterShift);

/** Bornes d'une occurrence d'équipe : { from, to }, `to` nul = équipe permanente */
export const occurrenceDays = (occurrence) => ({
  from: dayOf(occurrence?.fromDay, occurrence?.fromDate),
  to: dayOf(occurrence?.toDay, occurrence?.toDate),
});

/** Date de naissance d'un utilisateur (`userData` de l'authStore ou profil) */
export const birthDayOf = (user) => dayOf(user?.birthDay, user?.birthDate);

/** Jour d'activation d'une rotation (`activationDate` de la liste triée renvoyée par l'API) */
// TEMPORARY(day-fields): meme chose : l'API ne renverra plus que `activationDay`.
export const activationDay = (rotation) => dayOf(rotation?.activationDay, rotation?.activationDate);

/** Clé du jour courant (UTC, comme les jours stockés) */
export const todayKey = () => toDateKey(new Date());

/**
 * Affiche un jour (clé, ISO ou Date) sans passer par le fuseau du navigateur : un `new Date('2026-11-10')` s'affiche
 * le 9 dans un navigateur à l'ouest de l'UTC, un `PlainDate` jamais. Chaîne vide si la valeur n'est pas une date.
 */
export const formatDay = (value, options = { day: 'numeric', month: 'long', year: 'numeric' }, locale = 'fr-FR') => {
  const key = toDateKey(value);
  return key ? Temporal.PlainDate.from(key).toLocaleString(locale, options) : '';
};
