import cron from 'node-cron';
import { processPendingTransactions } from '../services/transactionService.js';

// Exécuter toutes les 30 minutes
cron.schedule('*/30 * * * *', async () => {
    try {
        const transactions = await processPendingTransactions();
        console.log(`${transactions} transactions traitées`);
    } catch (error) {
        console.error('Erreur lors du traitement des transactions:', error);
    }
}); 