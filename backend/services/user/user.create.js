import { v4 as uuidv4 } from 'uuid';
import { hash } from "bcrypt";
import User from '../../models/User.js';
import Center from '../../models/Center.js';
import Team from '../../models/Team.js';
import { sendAdminNotificationEmail } from '../email/adminNotificationEmail.js';
import { AppError } from '../../error/AppError.js';

export const createUserService = async (userData) => {
    const { name, lastName, password, email, centerId, team, points, approved } = userData;

    const hashedPassword = await hash(password, 10);
    const user = new User({
        name,
        lastName,
        email,
        id: uuidv4(),
        password: hashedPassword,
        centerId,
        points: points || 0,
        registrationStatus: approved ? 'verified' : 'pending',
    });


    const firstTeam = await Team.findOne({ _id: team, center: centerId });
    if (!firstTeam) {
        throw new AppError('Equipe non trouvée', 404);
    }
    const today = new Date();

    today.setUTCHours(0, 0, 0, 0);
    user.teams.push({ teamId: firstTeam._id, fromDate: today, toDate: null });

    await user.save();

    // Si l'utilisateur n'est pas approuvé, envoyer une notification aux administrateurs du centre
    if (!approved) {
        try {
            // Récupérer le centre et les administrateurs
            const center = await Center.findById(centerId);
            if (center) {
                const admins = await User.find({
                    centerId: centerId,
                    isAdmin: true
                }).select('email');

                const adminEmails = admins
                    .filter(admin => admin.email && admin.email.trim())
                    .map(admin => admin.email);

                if (adminEmails.length > 0) {
                    await sendAdminNotificationEmail(adminEmails, user, center);
                }
            }
        } catch (emailError) {
            // Ne pas faire échouer la création d'utilisateur si l'email échoue
            console.error('❌ Erreur lors de l\'envoi de la notification aux administrateurs:', emailError);
        }
    }

    return user;
};
