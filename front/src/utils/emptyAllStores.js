import { getActivePinia } from 'pinia';

// Vide chaque store déjà créé par sa fonction `emptyStore` (ou `resetStore`), quand il en a une. `_s` est la table des stores de
// Pinia : pas besoin de les importer un à un, et un store ajouté plus tard est vidé sans rien changer ici.
export function emptyAllStores() {
  getActivePinia()?._s.forEach((store) => (store.emptyStore ?? store.resetStore)?.());
}
