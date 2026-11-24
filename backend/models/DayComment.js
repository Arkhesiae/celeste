/**
 * Note d'un jour du calendrier : un commentaire libre de l'utilisateur sur un jour, **indépendant** de la vacation et des entrées du jour
 * (affectation, modification, ajustement d'horaires). Ce n'est donc pas une `CalendarEntry` : aucune annulation, aucun retour à la
 * vacation initiale ni aucun nettoyage de période (changement d'équipe, mutation) ne la touche, et elle n'empêche rien (une
 * modification reste possible si l'utilisateur tient une vacation). Elle ne disparaît que si l'utilisateur la change ou la supprime.
 * Un commentaire vide supprime le document. Collection `daycomments`.
 */
import mongoose from 'mongoose';
import { CALENDAR_COMMENT_MAX_LENGTH } from '../config/limits.js';

const DayCommentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        date: {
            type: String,
            required: true,
            match: /^\d{4}-\d{2}-\d{2}$/,
        },
        comment: {
            type: String,
            required: true,
            minlength: 1,
            maxlength: CALENDAR_COMMENT_MAX_LENGTH,
        },
    },
    { timestamps: true },
);

// Une note par utilisateur et par jour ; sert aussi à lire les notes d'une période
DayCommentSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('DayComment', DayCommentSchema);
