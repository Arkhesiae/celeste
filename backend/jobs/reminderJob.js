import cron from 'node-cron';
import { REMINDER_CRON } from '../config/schedules.js';
import { sendUpcomingReplacementReminders } from '../services/substitution/request.reminder.js';

// Toutes les heures : chaque centre est rappelé une fois, à partir de REMINDER_HOUR (heure locale du centre)
cron.schedule(REMINDER_CRON, async () => {
    try {
        const { sent, skipped } = await sendUpcomingReplacementReminders();
        if (sent || skipped) console.log(`${sent} rappel(s) de remplacement envoyé(s), ${skipped} ignoré(s) (préférences / pas d'email)`);
    } catch (error) {
        console.error('Erreur lors de l\'envoi des rappels de remplacement:', error);
    }
});
