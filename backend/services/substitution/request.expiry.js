/**
 * Tâches planifiées sur les demandes : archivage des demandes ouvertes passées, clôture des demandes acceptées terminées.
 */
import Substitution from '../../models/Substitution.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import { dayFilter } from '../../utils/dates/dayAccess.js';

/**
 * Archive les demandes de substitution ouvertes dont les dates sont passées
 * @returns {Promise<number>} Nombre de demandes archivées
 */
export const processPastDemands = async () => {
    const now = new Date();
    const today = todayIn().toString();

    // Trouve toutes les demandes ouvertes avec des dates passées (excluant aujourd'hui)
    const pastDemands = await Substitution.find({
        status: 'open',
        ...dayFilter('posterShift.day', 'posterShift.date', { lt: today }),
        deleted: false
    });

    // Archive les demandes trouvées
    const updatePromises = pastDemands.map(demand =>
        Substitution.findByIdAndUpdate(
            demand._id,
            {
                $set: {
                    deleted: true,
                    status: 'expired',
                    updatedAt: now
                }
            }
        )
    );

    await Promise.all(updatePromises);
    return pastDemands.length;
};

export const processAndCompleteDemands = async () => {
    const now = new Date();
    const today = todayIn().toString();
    const completedDemands = await Substitution.find({
        status: 'accepted',
        ...dayFilter('posterShift.day', 'posterShift.date', { lt: today }),
        deleted: false
    });

    const updatePromises = completedDemands.map(demand =>
        Substitution.findByIdAndUpdate(
            demand._id,
            { $set: { deleted: true, status: 'completed', updatedAt: now } }
        )
    );
    await Promise.all(updatePromises);
    return completedDemands.length;
};
