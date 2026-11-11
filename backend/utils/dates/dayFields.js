import { toPlainDate } from './plainDate.js';

/**
 * Jours stockés en chaîne `YYYY-MM-DD` (stockage normalisé), en parallèle des anciens champs `Date`.
 *
 * Étape « expand » de la migration : chaque champ-jour `Date` a un jumeau chaîne (`activationDates` -> `activationDays`,
 * `fromDate` -> `fromDay`...). Les anciens champs restent la source de vérité jusqu'à la bascule des lectures ;
 * `scripts/migrateDayFields.js` remplit et vérifie les jumeaux, puis on écrit les deux champs, on lit le jumeau, et
 * on supprime l'ancien champ.
 */

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Définition Mongoose d'un champ-jour : `YYYY-MM-DD` ou absent */
export const dayField = { type: String, match: [DAY_RE, 'Jour attendu au format YYYY-MM-DD'] };

/** Date | chaîne ISO | YYYY-MM-DD | PlainDate -> 'YYYY-MM-DD' (jour UTC) ; null si la valeur n'est pas une date */
export const toDay = (value) => toPlainDate(value)?.toString() ?? null;

/**
 * Registre des champs-jours à migrer. `type` :
 *   scalar  : un champ (chemin pointé) -> son jumeau ;
 *   array   : un tableau de dates -> un tableau de jours, même ordre ;
 *   subdocs : un tableau de sous-documents (avec _id) dont plusieurs champs ont un jumeau.
 */
// TEMPORARY(day-fields): registre des paires ancien champ / jumeau, utilise par migrateDayFields.js seulement ; a supprimer avec le script. (DAY_RE, dayField et toDay restent.)
export const DAY_FIELDS = [
    { key: 'rotation.activationDays', collection: 'rotations', type: 'array', from: 'activationDates', to: 'activationDays' },
    { key: 'center.cycleAnchorDay', collection: 'centers', type: 'scalar', from: 'cycleAnchorDate', to: 'cycleAnchorDay' },
    { key: 'user.birthDay', collection: 'users', type: 'scalar', from: 'personalData.birthDate', to: 'personalData.birthDay' },
    {
        key: 'user.teams.fromDay/toDay', collection: 'users', type: 'subdocs', array: 'teams',
        pairs: [{ from: 'fromDate', to: 'fromDay' }, { from: 'toDate', to: 'toDay' }],
    },
    { key: 'substitution.posterShift.day', collection: 'substitutions', type: 'scalar', from: 'posterShift.date', to: 'posterShift.day' },
    { key: 'substitution.accepterShift.day', collection: 'substitutions', type: 'scalar', from: 'accepterShift.date', to: 'accepterShift.day' },
];
