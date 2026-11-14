export const entryTypes = [
    { key: 'office', icon: 'chair-rolling', label: 'Bureau' },
    { key: 'english_training', icon: 'translate-variant', label: 'Anglais' },
    { key: 'stage', icon: 'book-open-page-variant-outline', label: 'Stage' },
    { key: 'training', icon: 'school', label: 'Formation' },
    { key: 'absence', icon: 'airplane-check', label: 'Congé' },
    { key: 'simulation', icon: 'desktop-classic', label: 'Simu' },
    { key: 'vis_med', icon: 'needle', label: 'Visite médicale' },
    { key: 'manager', icon: 'crown-outline', label: 'Chef' },
    { key: 'test', icon: 'school-outline', label: 'Test' },
]

/** Types d'affectation qui s'affichent (calendrier) mais que l'utilisateur ne crée pas depuis la tuile d'ajout */
const displayOnlyEntryTypes = [
    { key: 'instruc', icon: 'account-school-outline', label: 'Instruction' },
    { key: 'custom', icon: 'pencil-outline', label: 'Personnalisé' },
    { key: 'other', icon: 'dots-horizontal-circle-outline', label: 'Autre' },
    { key: 'sick_leave', icon: 'hospital-box-outline', label: 'Arrêt maladie' },
    { key: 'maternity_leave', icon: 'baby-carriage', label: 'Congé maternité' },
]

/** Type d'affectation (icône, libellé) pour une clé `subType` ; `undefined` si ce n'est pas une affectation affichable */
export const entryTypeOf = (key) => entryTypes.find((e) => e.key === key) ?? displayOnlyEntryTypes.find((e) => e.key === key)
