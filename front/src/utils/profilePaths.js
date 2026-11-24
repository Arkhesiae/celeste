// Adresses des pages d'un profil : les paramètres et l'historique des transactions sont des sous-pages du profil.
export const profilePath = (userId) => `/profile/${userId}`;
export const parametersPath = (userId) => `/profile/${userId}/parameters`;
export const transactionHistoryPath = (userId) => `/profile/${userId}/transaction-history`;
