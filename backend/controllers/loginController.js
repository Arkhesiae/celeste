import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const loginController = {
    login: async (req, res) => {
    const { email, password, stayConnected } = req.body;
    
    try {
        // Vérification si l'utilisateur existe
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'E-mail invalide, aucun utilisateur trouvé' });
        }

        // Vérification du mot de passe
        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return res.status(401).json({ error: 'Mot de passe invalide' });
        }

        // Génération du token d'accès (JWT)
        const accessToken = jwt.sign(
            { userId: user._id, isAdmin: user.isAdmin, adminType: user.adminType },
            'secret',
            { expiresIn: stayConnected ? '365d' : '2h' }
        );

        console.log("Se connecte : ", user.name + " " + user.lastName)

        const userData = {
            name: user.name,
            email: user.email,
            phone: user.personalData?.phoneNumber || '',
            birthDate: user.personalData?.birthDate || '',
            isAdmin: user.isAdmin,
            adminType: user.adminType,
            userId: user._id,
            preferences: user.preferences,
            centerId: user.centerId,
            avatar: user.avatar,
            status: user.registrationStatus || 'pending',
            accessToken: accessToken
        }
        // Réponse avec toutes les informations nécessaires
        res.json({userData, accessToken});
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ error: 'Une erreur est survenue lors de la connexion' });
    }
    }
} 



export default loginController; 