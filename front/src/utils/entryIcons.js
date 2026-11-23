export const entryTypes = [
  { key: 'office', icon: 'mdi-chair-rolling', label: 'Bureau' },
  { key: 'english_training', icon: 'mdi-translate-variant', label: 'Anglais' },
  { key: 'stage', icon: 'mdi-book-open-page-variant-outline', label: 'Stage' },
  { key: 'training', icon: 'mdi-school', label: 'Formation' },
  { key: 'absence', icon: 'mdi-airplane-check', label: 'Congé' },
  { key: 'simulation', icon: 'mdi-desktop-classic', label: 'Simu' },
  { key: 'vis_med', icon: 'mdi-needle', label: 'Visite médicale' },
  { key: 'manager', icon: 'mdi-crown-outline', label: 'Chef' },
  { key: 'test', icon: 'mdi-school-outline', label: 'Test' },
];

/** Types d'affectation qui s'affichent (calendrier) mais que l'utilisateur ne crée pas depuis la tuile d'ajout */
const displayOnlyEntryTypes = [
  { key: 'instruc', icon: 'mdi-account-school-outline', label: 'Instruction' },
  { key: 'custom', icon: 'mdi-pencil-outline', label: 'Personnalisé' },
  { key: 'other', icon: 'mdi-dots-horizontal-circle-outline', label: 'Autre' },
  { key: 'sick_leave', icon: 'mdi-hospital-box-outline', label: 'Arrêt maladie' },
  { key: 'maternity_leave', icon: 'mdi-baby-carriage', label: 'Congé maternité' },
];

/** Type d'affectation (icône, libellé) pour une clé `subType` ; `undefined` si ce n'est pas une affectation affichable */
export const entryTypeOf = (key) =>
  entryTypes.find((e) => e.key === key) ?? displayOnlyEntryTypes.find((e) => e.key === key);
