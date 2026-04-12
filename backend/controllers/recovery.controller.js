import { LegacyUser, User } from '../models/User.js';
import Team from '../models/Team.js';
import Center from '../models/Center.js';
import { AppError } from '../error/AppError.js';

export const fetchLegacyUser = async (req, res) => {
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

export const initiateAccountRecovery = async (req, res, next) => { 
    try {
       
        const { login, center, oldEmail, email, password, firstName, lastName, equipe, points } = req.body;
      
        const user = await LegacyUser.findOne({
            $or: [
                { login: login },
                { email: oldEmail }
            ],
        });
        if (!user) {
            throw new AppError('Aucun utilisateur trouvé.', 404);
        }

        const conflict = await User.findOne({
            $or: [
                { login: login },
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

  
        user.recovered = true
        await user.save()

        req.body = {
            name: firstName,
            lastName: lastName,
            password: password,
            email: email,
            centerId: center,
            team: team._id,
            points: points,
            approved: true,
        }
        next()

        
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