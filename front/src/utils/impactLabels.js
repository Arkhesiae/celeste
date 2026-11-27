/** Libellés et icônes de l'aperçu d'impact (components/Impact/ImpactPreview.vue) */
import { formatDay } from './dayFields.js';
import { entryTypeOf } from './entryIcons.js';

const SHORT_DATE = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
const day = (value) => formatDay(value, SHORT_DATE);

const DEMAND_TYPES = { substitution: 'remplacement', switch: 'permutation', hybrid: 'remplacement ou permutation' };

/** Ce qu'il advient de la demande : le mot et l'icône, la couleur ne portant rien seule */
const demandOutcome = ({ action, cascade }) => {
  if (action === 'withdraw') {
    return { label: "Retrait de l'accepteur", icon: 'mdi-account-arrow-left-outline', color: 'warning' };
  }
  if (cascade) return { label: 'Annulée car elle dépend d’une autre', icon: 'mdi-link-variant-off', color: 'error' };
  return { label: 'Annulée', icon: 'mdi-close-circle-outline', color: 'error' };
};

export const demandImpact = (demand) => {
  const { label, icon, color } = demandOutcome(demand);
  const dates = [day(demand.date)];
  if (demand.accepterDate && demand.accepterDate !== demand.date) dates.push(day(demand.accepterDate));

  const people = [`de ${demand.poster ?? '?'}`];
  people.push(demand.accepter ? `acceptée par ${demand.accepter}` : 'ouverte');

  return {
    id: demand.id,
    icon,
    color,
    title: `${label} : ${DEMAND_TYPES[demand.type] ?? 'demande'} du ${dates.join(' et du ')}`,
    subtitle: people.join(' · '),
    transfers: demand.transfers ?? [],
  };
};

export const transferTitle = ({ amount, sender, receiver }) =>
  `Transfert de ${amount} points de ${sender ?? '?'} vers ${receiver ?? '?'} annulé`;

/** Modifications et ajustements d'horaires, par `subType` ; les affectations viennent d'entryIcons.js */
const ENTRY_KINDS = {
  substitution: { label: 'Remplacement', icon: 'mdi-account-switch-outline' },
  disp: { label: 'Dispo', icon: 'mdi-account-off-outline' },
  pres: { label: 'Présence', icon: 'mdi-account-check-outline' },
  vic: { label: 'VIC', icon: 'mdi-account-clock-outline' },
  variation: { label: 'Variante horaire', icon: 'mdi-clock-edit-outline' },
  mdda: { label: 'MDDA', icon: 'mdi-clock-plus-outline' },
  assignment_patch: { label: 'Horaires modifiés', icon: 'mdi-clock-plus-outline' },
};

export const entryImpact = (entry) => {
  const kind = ENTRY_KINDS[entry.subType] ?? entryTypeOf(entry.subType);
  return {
    id: entry.id,
    icon: kind?.icon ?? 'mdi-calendar-remove-outline',
    title: `${kind?.label ?? 'Entrée'} du ${day(entry.date)}`,
  };
};
