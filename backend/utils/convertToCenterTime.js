/**
 * Convertit une date dans un fuseau horaire spécifique
 * @param {Date} dateInput - La date à convertir
 * @param {string} [centerTimezone="Europe/Paris"] - Le fuseau horaire cible
 * @returns {Date} La date convertie dans le fuseau horaire spécifié
 * @throws {Error} Si la date d'entrée n'est pas valide ou si le fuseau horaire n'est pas valide
 */
const convertToCenterTime = (dateInput, centerTimezone = "Europe/Paris") => {
  // Validation de la date d'entrée
  if (!(dateInput instanceof Date) || isNaN(dateInput)) {
    throw new Error("La date d'entrée doit être un objet Date valide");
  }

  // Validation du fuseau horaire
  try {
    Intl.DateTimeFormat(undefined, { timeZone: centerTimezone });
  } catch (error) {
    throw new Error(`Le fuseau horaire "${centerTimezone}" n'est pas valide`);
  }

  // Création d'un formateur avec le fuseau horaire spécifié
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: centerTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Formatage de la date en préservant l'heure d'origine
  const formattedDate = formatter.format(dateInput);
  const convertedDate = new Date(formattedDate);

  // Vérification que la conversion a réussi
  if (isNaN(convertedDate)) {
    throw new Error("La conversion de la date a échoué");
  }

  return convertedDate;
}

export { convertToCenterTime };