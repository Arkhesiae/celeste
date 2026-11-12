import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Dossiers du backend.
 */
export const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Fichiers servis tels quels : le front compilé (copié par le Dockerfile) et les avatars */
export const PUBLIC_DIRECTORY = path.join(BACKEND_ROOT, 'public');

/** Avatars téléversés : données d'exécution, non suivies par git (le dossier est créé au besoin) */
export const AVATARS_DIRECTORY = path.join(PUBLIC_DIRECTORY, 'avatars');
