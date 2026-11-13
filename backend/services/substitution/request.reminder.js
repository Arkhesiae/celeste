import { Temporal } from '@js-temporal/polyfill';
import { dayFilter } from '../../utils/dates/dayAccess.js';
import Center from '../../models/Center.js';
import Substitution from '../../models/Substitution.js';
import { sendReplacementReminderEmail } from '../email/demand/demand.emails.js';

import { DEFAULT_REMINDER_HOUR } from '../../config/schedules.js';
/**
 * Rappel de la veille : prévient l'accepteur d'un remplacement / d'une permutation qui a lieu demain.
 *
 * - « Demain » et l'heure d'envoi sont évalués dans le fuseau horaire de chaque centre.
 * - Le rappel part à partir de REMINDER_HOUR (18 h par défaut) heure locale, et au plus une fois par acceptation :
 *   `reminderSentAt` est réservé de façon atomique avant l'envoi (plusieurs instances / relances sans doublon) et
 *   libéré si l'envoi échoue, pour un nouvel essai à l'exécution suivante.
 * - Les préférences email de l'accepteur sont respectées (`all` et la catégorie replacement / switch).
 *
 * @param {Object} [opts]
 * @param {Date} [opts.now] - instant courant (injectable pour les tests)
 * @param {number} [opts.hour] - heure locale à partir de laquelle on rappelle
 * @returns {Promise<{ sent: number, skipped: number }>}
 */
export async function sendUpcomingReplacementReminders ({ now = new Date(), hour = Number(process.env.REMINDER_HOUR ?? DEFAULT_REMINDER_HOUR) } = {}) {
    const centers = await Center.find({}).select('timeZone');
    let sent = 0;
    let skipped = 0;

    for (const center of centers) {
        const local = Temporal.Instant.fromEpochMilliseconds(now.getTime())
            .toZonedDateTimeISO(center.timeZone || 'Europe/Paris');
        if (local.hour < hour) continue;

        const tomorrow = local.toPlainDate().add({ days: 1 }).toString();

        const demands = await Substitution.find({
            centerId: center._id,
            status: 'accepted',
            deleted: { $ne: true },
            reminderSentAt: null,
            ...dayFilter('posterShift.day', 'posterShift.date', { eq: tomorrow }),
        }).populate([
            { path: 'posterId', select: 'name lastName' },
            { path: 'accepterId', select: 'name email isActive preferences' },
            { path: 'posterShift.shift', populate: { path: 'variations' } },
            { path: 'posterShift.selectedVariation' },
            { path: 'posterShift.teamId', select: 'name' },
            { path: 'accepterShift.shift', select: 'name' },
        ]);

        for (const demand of demands) {
            const accepter = demand.accepterId;
            const category = demand.accepterShift?.shift ? 'switch' : 'replacement';
            const prefs = accepter?.preferences?.emails;
            const wantsEmail = accepter?.email?.trim() && accepter.isActive !== false
                && prefs?.all !== false && prefs?.categories?.[category] !== false;
            if (!wantsEmail) { skipped += 1; continue; }

            // Réservation atomique : seule une exécution envoie ; timestamps:false laisse updatedAt intact
            const claimed = await Substitution.findOneAndUpdate(
                { _id: demand._id, status: 'accepted', reminderSentAt: null },
                { $set: { reminderSentAt: now } },
                { timestamps: false }
            );
            if (!claimed) continue;

            try {
                const result = await sendReplacementReminderEmail(demand);
                if (result?.sent === false) throw new Error(result.error ?? 'envoi refusé');
                sent += 1;
            } catch (error) {
                console.error(`❌ Rappel non envoyé pour la demande ${demand._id}:`, error.message);
                await Substitution.updateOne({ _id: demand._id }, { $set: { reminderSentAt: null } }, { timestamps: false });
            }
        }
    }

    return { sent, skipped };
}
