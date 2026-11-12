import fs from 'fs';
import path from 'path';
import User from '../../models/User.js';
import { toDay } from '../../utils/dates/dayFields.js';
import { findOrThrow } from '../../utils/mongo.js';
import { fullName } from '../../utils/names.js';
import { AppError } from '../../error/AppError.js';
import { AVATARS_DIRECTORY } from '../../config/paths.js';
import { AVATAR_MAX_BYTES } from '../../config/limits.js';

/**
 * Profil d'un utilisateur : préférences, e-mail, téléphone, date de naissance, avatar, et informations publiques de
 * l'écran de connexion.
 */

/** Met à jour un champ du compte et renvoie l'utilisateur ; 404 s'il n'existe pas */
const updateUser = async (userId, update) => {
    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }
    return user;
};

export async function updateUserPreferences (id, preferences) {
    const user = await updateUser(id, { $set: { preferences } });
    return user.preferences;
}

export async function getUserPreferences (id) {
    const user = await findOrThrow(User, id, { message: 'Utilisateur non trouvé' });
    return user.preferences;
}

/** Change l'e-mail du compte ; refusé s'il est déjà utilisé */
export async function updateEmail (userId, email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AppError('Cette adresse email est déjà utilisée', 400);
    }
    return updateUser(userId, { email });
}

export const updatePhone = (userId, phone) => updateUser(userId, { 'personalData.phoneNumber': phone });

export const deletePhone = (userId) => updateUser(userId, { 'personalData.phoneNumber': null });

/** Date de naissance : l'ancien champ et son jumeau « jour » (YYYY-MM-DD) sont écrits ensemble */
export const updateBirthDate = (userId, birthDate) =>
    updateUser(userId, { 'personalData.birthDate': birthDate, 'personalData.birthDay': toDay(birthDate) });

/**
 * Enregistre l'avatar téléversé (fichier déjà reçu par multer) : contrôle le type et la taille, le range dans le
 * dossier des avatars et met à jour le compte.
 * @param {string} userId
 * @param {{ mimetype: string, size: number, filename: string, path: string }|undefined} avatar - fichier multer
 * @returns {Promise<string>} adresse de l'avatar (`/avatars/<fichier>`)
 */
export async function updateAvatar (userId, avatar) {
    if (!avatar) {
        throw new AppError('Aucune image fournie', 400);
    }

    if (!avatar.mimetype.startsWith('image/')) {
        throw new AppError('Le fichier doit être une image', 400);
    }

    if (avatar.size > AVATAR_MAX_BYTES) {
        throw new AppError('L\'image ne doit pas dépasser 10MB', 400);
    }

    const uploadPath = path.join(AVATARS_DIRECTORY, avatar.filename);
    await fs.promises.mkdir(path.dirname(uploadPath), { recursive: true });
    await fs.promises.rename(avatar.path, uploadPath);

    const user = await updateUser(userId, { avatar: `/avatars/${avatar.filename}` });
    return user.avatar;
}

/**
 * Ce que l'écran de connexion affiche pour un e-mail : nom, avatar, centre. Route publique : pas de rôle, pour ne pas
 * révéler qui sont les administrateurs.
 */
export async function getUserLoginInfo (email) {
    const user = await User.findOne({ email })
        .select('name lastName avatar')
        .populate('centerId', 'name');

    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }

    return {
        name: fullName(user),
        avatar: user.avatar,
        center: user.centerId?.name || ''
    };
}
