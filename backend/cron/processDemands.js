const cron = require('node-cron');
const { processPastDemands } = require('../services/demandService');

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