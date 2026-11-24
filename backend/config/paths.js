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

/** Décor des mails (PNG et SVG de l'en-tête et du pied), servi publiquement sur `/api/mail-assets` : suivi par git, voir `scripts/buildMailArt.mjs` */
export const MAIL_ASSETS_DIRECTORY = path.join(BACKEND_ROOT, 'assets', 'mail');
