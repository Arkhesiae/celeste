import express from 'express';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const router = express.Router();

// Fetch notifications for a user
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({message: 'No userId specified'});  // Retourne un code 400 si le nom du centre est manquant
        }

        console.log('Fetching notifications for userId : ', userId);

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }

      
        // Fetch notifications for the user, sorted by creation date (newest first)
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 });

        res.status(200).json(notifications);

    } catch (error) {
        console.error('Error fetching notifications:', error);
        // res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

// Mark a notification as read
router.put('/:notificationId', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(req.params.notificationId, { seen: true }, { new: true });
        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification.' });
    }
});

export default router;
