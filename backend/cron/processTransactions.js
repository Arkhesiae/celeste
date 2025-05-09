const cron = require('node-cron');
const { processPendingTransactions } = require('../services/transactionService');

// Exécuter toutes les 1 minutes
cron.schedule('*/1 * * * *', async () => {
    try {
        console.log('Traitement des transactions différées...');
        await processPendingTransactions();
        console.log('Traitement des transactions terminé');
    } catch (error) {
        console.error('Erreur lors du traitement des transactions:', error);
    }
}); 