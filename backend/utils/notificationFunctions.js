// Function to create notifications for all users
const {User} = require("../models/userModel");
const Notification = require('../models/notificationModel');

async function createNotificationForAllUsers(message, type = 'general') {
    try {
        const users = await User.find({}, '_id'); // Fetch all user IDs
        const notifications = users.map(user => ({
            userId: user._id,
            message,
            type,
        }));
        await Notification.insertMany(notifications); // Bulk insert notifications
    } catch (error) {
        console.error('Error sending notifications to all users:', error);
    }
}

// Function to create notifications for all users
const createNotificationForCenter = async (content, type = 'general', centerId) => {
    try {
        const users = await User.find({centerId}, '_id'); // Fetch all user IDs
        const notifications = users.map(user => ({
            userId: user._id,
            message: content.message,
            title: content.title,
            type,
        }));
        await Notification.insertMany(notifications); // Bulk insert notifications
    } catch (error) {
        console.error('Error sending notifications to all users:', error);
    }
}

module.exports = { createNotificationForCenter };