import cron from 'node-cron';
import { processPastDemands, processAndCompleteDemands } from '../services/demandService.js';

// Exécuter toutes les 1 minutes
cron.schedule('*/1 * * * *', async () => {
    try {
        const pastDemands = await processPastDemands();
        const completedDemands = await processAndCompleteDemands();
        console.log(`${pastDemands} demandes annulées et ${completedDemands} demandes complétées et archivées`);
    } catch (error) {
        console.error('Erreur lors du traitement des demandes:', error);
    }
});  