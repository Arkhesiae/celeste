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
    cycleStartDate: { type: Date },
    order: { type: Number, default: 0 },
    deleted: { type: Boolean, default: false },
    // Optional, in case teams are temporary
});

const Team = mongoose.model('Team', teamSchema);

export default Team;
