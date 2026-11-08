import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
    name: { type: String, required: true },  // Can be '1', '2', 'A', 'B', '1 Red', etc.
    center: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },  // The center this team belongs to
    startDate: { type: Date, default: () => {
            const currentDate = new Date();
            currentDate.setUTCHours(0, 0, 0, 0); // Set the time to midnight UTC
            return currentDate;
        } },
    endDate: { type: Date }, 
    // Ancien modèle (conservé pendant la migration, voir utils/teamCycle.js) : date de début de cycle propre à l'équipe
    cycleStartDate: { type: Date },
    // Nouveau modèle : position de l'équipe dans le cycle (0..N-1, unique dans le centre) ; début de cycle = Center.cycleAnchorDate + offset
    cycleOffset: { type: Number, min: 0, validate: { validator: Number.isInteger, message: 'cycleOffset doit être un entier' } },
    order: { type: Number, default: 0 },
    deleted: { type: Boolean, default: false },
    // Optional, in case teams are temporary
});

const Team = mongoose.model('Team', teamSchema);

export default Team;
