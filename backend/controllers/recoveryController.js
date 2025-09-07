import { LegacyUser, User } from '../models/User.js';
import Team from '../models/Team.js';
import Center from '../models/Center.js';

// Recherche d'utilisateur(s) LegacyUser par nom ou email
export const fetchLegacyUser = async (req, res) => {
    try {
        const { login, center } = req.query;
        if (!login || !center) {
            return res.status(400).json({ message: 'Veuillez fournir un login et un centre.' });
        }


        const user = await LegacyUser.findOne({
            $or: [
                { login: login },
                { email: login }
            ],
        });

       
        if (!user) {
            return res.status(404).json({ message: 'Aucun utilisateur trouvé.' });
        }
        if (user.recovered) {
            return res.status(400).json({ message: 'Ce compte a déjà été récupéré.' });
        }

  

        const newCenter = await checkCenter(user.centre, user.equipe, center)

        if (!newCenter) {
            return res.status(404).json({ message: 'Le centre renseigné n\'est pas valide' });
        }


   
        res.json({
            user: user,
            newCenter: newCenter
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
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
            return res.status(400).json({ message: 'Aucun utilisateur trouvé.' });
        }

        const conflict = await User.findOne({
            $or: [
                { login: login },
                { email: email }
            ],
        });
        
        if (conflict) {
            return res.status(400).json({ message: 'Un compte avec cet email existe déjà.' });
        }

        const team = await Team.findOne({
            name: equipe,
            center: center
        });

        if (!team) {
            return res.status(400).json({ message: 'L\'équipe renseignée n\'est pas valide.' });
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
        res.status(500).json({ message: error.message });
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