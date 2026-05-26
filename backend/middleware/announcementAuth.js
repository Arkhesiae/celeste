import PublicAnnouncement from '../models/PublicAnnouncement.js';
import { AppError } from '../error/appError.js';
import User from '../models/User.js';


export const authorizeAnnouncementAccess = async (req, res, next) => {
    try {
        const announcement = await PublicAnnouncement.findById(req.params.id);
        const user = await User.findById(req.user.userId).select('centerId adminType').lean();
        if (!announcement) throw new AppError('Annonce non trouvée', 404);

        if (user.adminType !== 'master') {
            if (announcement.isGlobal || !announcement.centerId?.equals(user.centerId)) {
                throw new AppError('Accès refusé. Vous ne pouvez pas modifier cette annonce.', 403);
            }
        }

        req.user.centerId = user.centerId;

        next();
    } catch (err) {
        next(err);
    }
};