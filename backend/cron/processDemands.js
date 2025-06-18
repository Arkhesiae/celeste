import cron from 'node-cron';
import { processPastDemands } from '../services/demandService.js';

// Exécuter toutes les 1 minutes
cron.schedule('*/1 * * * *', async () => {
    try {
        console.log('Archivage des demandes...');
        await processPastDemands();
        console.log('Archivage des demandes terminées et ouvertes');
    } catch (error) {
        console.error('Erreur lors du traitement des demandes:', error);
    }
});  