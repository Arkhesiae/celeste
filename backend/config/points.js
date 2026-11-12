/**
 * Règles de points (échanges de vacations et transferts entre agents).
 */

/** Solde minimal d'un agent : en dessous, il ne peut plus poster de demande, transférer des points ni voir un transfert différé s'exécuter */
export const MIN_POINTS_BALANCE = -40;

/** Un agent ne peut pas accepter une demande qui lui ferait dépasser ce total de points */
export const MAX_POINTS_TO_ACCEPT_REQUEST = 99999;

/** Points d'une vacation : `floor(durée en heures × SHIFT_POINTS_PER_HOUR) + SHIFT_BASE_POINTS` */
export const SHIFT_POINTS_PER_HOUR = 1;
export const SHIFT_BASE_POINTS = 2;
