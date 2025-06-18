import Substitution from '../models/Substitution.js';

/**
 * Archive les demandes de substitution ouvertes dont les dates sont passées
 * @returns {Promise<number>} Nombre de demandes archivées
 */
const processPastDemands = async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Trouve toutes les demandes ouvertes avec des dates passées (excluant aujourd'hui)
    const pastDemands = await Substitution.find({
        status: 'open',
        'posterShift.date': { $lt: startOfToday },
        deleted: false
    });

    // Archive les demandes trouvées
    const updatePromises = pastDemands.map(demand => 
        Substitution.findByIdAndUpdate(
            demand._id,
            { 
                $set: { 
                    deleted: true,
                    status: 'cancelled',
                    updatedAt: now
                }
            }
        )
    );

    await Promise.all(updatePromises);
    return pastDemands.length;
};

export { processPastDemands };
