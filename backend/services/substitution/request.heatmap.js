import { Temporal } from '@js-temporal/polyfill';
import { eachDay, toMongoDate } from '../../utils/dates/plainDate.js';
import mongoose from 'mongoose';
import Substitution from '../../models/Substitution.js';
import { AppError } from '../../error/AppError.js';
import { isValidDate } from '../../utils/validation.js';


const MAX_DAYS = 190;   // six mois

/**
 * Charge de demandes par jour pour un centre : pour chaque jour de la période, combien de demandes ouvertes et
 * combien d'acceptées (et non terminées) portent sur ce jour. Sert à repérer les dates « tendues ».
 *
 * Comptes uniquement : pas de contenu de demande (donc ouvert à tout membre du centre), pas de catégorisation et
 * aucun effet de bord (contrairement à getRequests, qui marque les demandes comme vues).
 * Le jour d'une demande est celui de sa vacation d'origine (`posterShift.date`, jour calendaire stocké à minuit UTC).
 *
 * @param {string} centerId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD (inclus)
 * @returns {Promise<Array<{ date: string, open: number, accepted: number }>>} un élément par jour de la période
 */
export async function getDemandHeatmap (centerId, startDate, endDate) {
    if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
        throw new AppError('Période invalide (YYYY-MM-DD)', 400);
    }
    let first, last;
    try {
        first = Temporal.PlainDate.from(startDate);
        last = Temporal.PlainDate.from(endDate);
    } catch {
        throw new AppError('Période invalide (YYYY-MM-DD)', 400);
    }
    const days = eachDay(first, last);
    if (days.length > MAX_DAYS) throw new AppError(`La période ne peut pas dépasser ${MAX_DAYS} jours`, 400);

    const counts = await Substitution.aggregate([
        {
            $match: {
                centerId: new mongoose.Types.ObjectId(centerId),
                deleted: false,
                status: { $in: ['open', 'accepted'] },
                'posterShift.date': { $gte: toMongoDate(first), $lt: toMongoDate(last.add({ days: 1 })) },
            },
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$posterShift.date', timezone: 'UTC' } },
                    status: '$status',
                },
                count: { $sum: 1 },
            },
        },
    ]);

    const byDay = new Map(days.map((date) => [date, { date, open: 0, accepted: 0 }]));
    for (const { _id, count } of counts) {
        const day = byDay.get(_id.date);
        if (day) day[_id.status] = count;
    }
    return [...byDay.values()];
}
