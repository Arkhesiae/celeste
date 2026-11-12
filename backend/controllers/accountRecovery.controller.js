import { LegacyUser, User } from '../models/User.js';
import Team from '../models/Team.js';
import Center from '../models/Center.js';
import { AppError } from '../error/AppError.js';
import { readNewUser } from './user.controller.js';

export const fetchLegacyUser = async (req, res, next) => {
    try {
        const { login, center } = req.query;
        if (!login || !center) {
            throw new AppError('Veuillez fournir un login et un centre.', 400);
        }

        const user = await LegacyUser.findOne({
            $or: [
                { login: login },
                { email: login }
            ],
        });
       
        if (!user) {
            throw new AppError('Aucun utilisateur trouvé.', 404);
        }
        if (user.recovered) {
            throw new AppError('Ce compte a déjà été récupéré.', 400);
        }

        const newCenter = await checkCenter(user.centre, user.equipe, center)

        if (!newCenter) {
            throw new AppError('Le centre renseigné n\'est pas valide', 404);
        }

   
        res.json({
            user: user,
            newCenter: newCenter
        });
    } catch (error) {
        next(error);
    }
};

// Récupération d'un ancien compte : retrouve le compte d'origine, puis prépare le corps de la création du nouveau
// (`createRecoveredUser` suit sur la route). Rien de ce qui touche aux droits ne vient du client : le solde de points est
// celui de l'ancien compte (`compte`) et un ancien compte ne peut être récupéré qu'une fois.
export const initiateAccountRecovery = async (req, res, next) => {
    try {
        const { login, center, oldEmail, email, password, firstName, lastName, equipe } = req.body;

        // L'ancien compte se retrouve par son login, par son ancien email, ou par l'un ou l'autre : au moins un des deux
        const legacyCredentials = [];
        if (typeof login === 'string' && login.trim()) legacyCredentials.push({ login });
        if (typeof oldEmail === 'string' && oldEmail.trim()) legacyCredentials.push({ email: oldEmail });
        if (legacyCredentials.length === 0) {
            throw new AppError('Veuillez fournir le login ou l\'ancien email.', 400);
        }

        const user = await LegacyUser.findOne({ $or: legacyCredentials });
        if (!user) {
            throw new AppError('Aucun utilisateur trouvé.', 404);
        }
        if (user.recovered) {
            throw new AppError('Ce compte a déjà été récupéré.', 400);
        }

        const conflict = await User.findOne({
            $or: [
                ...(typeof login === 'string' && login.trim() ? [{ login }] : []),
                { email: email }
            ],
        });

        if (conflict) {
            throw new AppError('Un compte avec cet email existe déjà.', 400);
        }

        const team = await Team.findOne({
            name: equipe,
            center: center
        });

        if (!team) {
            throw new AppError('L\'équipe renseignée n\'est pas valide.', 400);
        }

        // Contrôle des données du nouveau compte avant de consommer l'ancien (sinon un mot de passe trop court le perdrait)
        const newUser = readNewUser({ name: firstName, lastName, email, password, centerId: center, team: team._id });

        // Solde de l'ancien compte, tel quel (il peut être négatif) ; 0 si `compte` n'est pas un nombre
        const balance = Number(user.compte);
        const points = Number.isFinite(balance) ? Math.trunc(balance) : 0;

        // Prise atomique de l'ancien compte : deux demandes simultanées ne peuvent pas le récupérer toutes les deux
        const claimed = await LegacyUser.findOneAndUpdate(
            { _id: user._id, recovered: { $ne: true } },
            { recovered: true }
        );
        if (!claimed) {
            throw new AppError('Ce compte a déjà été récupéré.', 400);
        }

        req.body = { ...newUser, points };
        next();
    } catch (error) {
        next(error);
    }
}


const checkCenter = async (center, equipe, centerToCheck) => {
    const newCenter = await Center.findOne({ OACI: centerToCheck })
  
    if (!center) {
        return null
    }

 
    if (center.toUpperCase() === centerToCheck) {
        return newCenter._id
    }

    let zoneIndicator

    if (equipe > 0) {
        zoneIndicator = 1
    }
    else {
        zoneIndicator = 2
    }
 
    if (center.toUpperCase().slice(0, 3) + zoneIndicator === centerToCheck) {
        return newCenter._id
    }
    return null
}