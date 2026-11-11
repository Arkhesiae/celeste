// TEMPORARY(day-fields): le front enverra des YYYY-MM-DD (toDateKey / PlainDate) ; supprimer ce fichier et son doublon src/utils.js quand les 3 appelants (TeamChangeDialog, rotation.vue, Unused/SwitchForm) sont migres.
export const toUTCNormalized = (input) => {
    if (!input) {
      return;
    }
  
    // Get the local date from input
    const localDate = new Date(input);
  
    // Adjust for the local timezone offset
    const utcDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
  
    // Set the time to 00:00 UTC
    utcDate.setUTCHours(0, 0, 0, 0);
  
    // Return the date in 'YYYY-MM-DD' format
    return utcDate.toISOString();
  }
  