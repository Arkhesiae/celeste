import cron from 'node-cron';
import { processPendingTransactions } from '../services/transactionService.js';

// Exécuter toutes les 1 minutes
cron.schedule('*/1 * * * *', async () => {
    try {
        const transactions = await processPendingTransactions();
        console.log(`${transactions} transactions traitées`);
    } catch (error) {
        console.error('Erreur lors du traitement des transactions:', error);
    }
}); 