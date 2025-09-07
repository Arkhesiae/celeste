import User from '../models/User.js';
import Team from '../models/Team.js';
import Center from '../models/Center.js';
import bcrypt from 'bcrypt';

async function generateTeamUsers() {
    try {
        // Récupérer tous les centres actifs
        const centers = await Center.find({ deleted: false });
        
        for (const center of centers) {
            // Récupérer toutes les équipes actives du centre
            const teams = await Team.find({ 
                center: center._id,
                deleted: false,
                endDate: { $exists: false } // Équipes sans date de fin
            });

            for (const team of teams) {
                // Créer l'email et le nom d'utilisateur
                const email = `user${team.name}@${center.name.toLowerCase().replace(/\s+/g, '')}.com`;
                const name = `User ${team.name}`;
             
                // Vérifier si l'utilisateur existe déjà
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    console.log(`L'utilisateur ${email} existe déjà`);
                    continue;
                }

                // Hasher le mot de passe
                const hashedPassword = await bcrypt.hash('user', 10);

                // Créer le nouvel utilisateur
                const newUser = new User({
                    email,
                    password: hashedPassword,
                    name,
                    lastName: center.name,
                    centerId: center._id,
                    teams: [{
                        teamId: team._id,
                        fromDate: new Date()
                    }],
                    registrationStatus: 'verified',
                    isActive: true
                });

                await newUser.save();
                console.log(`Utilisateur créé : ${email}`);
            }
        }

        return { success: true, message: 'Utilisateurs des équipes générés avec succès' };
    } catch (error) {
        console.error('Erreur lors de la génération des utilisateurs :', error);
        return { success: false, error: error.message };
    }
}

export default generateTeamUsers; 