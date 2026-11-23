// Dates affichées à l'écran, en français. Un seul endroit pour les formats : un composant n'écrit pas son propre `toLocaleDateString`.
const format = (date, options) => new Date(date).toLocaleDateString('fr-FR', options);

// 03/04/2026
const formatDate = (date) => format(date, { day: '2-digit', month: '2-digit', year: 'numeric' });

// 03/04/2026 14:30
export const formatDateTime = (date) =>
  format(date, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// 3 avril 2026
export const formatDateLong = (date) => format(date, { day: 'numeric', month: 'long', year: 'numeric' });

// 03 avr.
export const formatDayMonth = (date) => format(date, { day: '2-digit', month: 'short' });

export default formatDate;
