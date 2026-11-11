import { Temporal } from '@js-temporal/polyfill';

/**
 * Vacation de contrôle de nuit : l'agent travaille à un moment quelconque entre 00h00 et 06h00 (heure du centre).
 *
 * `start` et `end` sont des `Temporal.ZonedDateTime` dans le fuseau du centre (voir shiftTime.js), qui porte donc la
 * plage 00h00-06h00 : celle de chaque jour LOCAL que la vacation traverse. Une vacation « empiète » sur la plage si
 * elle a au moins une minute dans [00h00, 06h00[ (22:00-06:00 : oui ; 06:00-14:00 : non ; 16:00-00:00 : non ;
 * 16:00-00:01 : oui). Le jour d'un changement d'heure, la plage existe toujours ; seule sa durée réelle change.
 *
 * @param {{ start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime }} shift
 * @returns {boolean}
 */
export const isNightControl = ({ start, end }) => {
  if (Temporal.ZonedDateTime.compare(end, start) <= 0) return false;

  const lastDay = end.toPlainDate();
  for (let day = start.toPlainDate(); Temporal.PlainDate.compare(day, lastDay) <= 0; day = day.add({ days: 1 })) {
    const nightStart = day.toZonedDateTime({ timeZone: start.timeZoneId, plainTime: '00:00' });
    const nightEnd = day.toZonedDateTime({ timeZone: start.timeZoneId, plainTime: '06:00' });
    if (Temporal.ZonedDateTime.compare(start, nightEnd) < 0 && Temporal.ZonedDateTime.compare(end, nightStart) > 0) return true;
  }
  return false;
};
