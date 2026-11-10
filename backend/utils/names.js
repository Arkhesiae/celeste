/**
 * Noms affichables d'un utilisateur (`{ name, lastName }`, peuplé ou non).
 * Les champs absents sont ignorés : jamais de « undefined » dans un message ou un email.
 */

/** « Prénom Nom », ou '' si l'utilisateur n'a ni l'un ni l'autre */
export const fullName = (user) => [user?.name, user?.lastName].filter(Boolean).join(' ');

/** « Prénom N. » (initiale du nom), ou null si l'utilisateur est absent ou sans nom : pour les emails entre collègues */
export const shortName = (user) => {
    if (!user) return null;
    const initial = user.lastName ? `${user.lastName.slice(0, 1)}.` : '';
    return [user.name, initial].filter(Boolean).join(' ') || null;
};
