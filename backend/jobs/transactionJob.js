import cron from 'node-cron';
import { TRANSACTION_JOB_CRON } from '../config/schedules.js';
import { processPendingTransactions } from '../services/transaction/transaction.scheduled.js';

// Exécuter toutes les 30 minutes
cron.schedule(TRANSACTION_JOB_CRON, async () => {
    try {
        const transactions = await processPendingTransactions();
        console.log(`${transactions} transactions traitées`);
    } catch (error) {
        console.error('Erreur lors du traitement des transactions:', error);
    }
}); 