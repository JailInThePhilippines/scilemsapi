const notificationService = require('../utils/notificationService');

/**
 * Get all notifications for the current user
 */
exports.getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await notificationService.getUserNotifications(userId);
        
        res.status(200).json({
            message: 'Notifications retrieved successfully',
            notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Mark a notification as read
 */
exports.markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const updatedNotification = await notificationService.markAsRead(notificationId);
        
        if (!updatedNotification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        
        res.status(200).json({
            message: 'Notification marked as read',
            notification: updatedNotification
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Mark all notifications as read for the current user
 */
exports.markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await notificationService.markAllAsRead(userId);
        
        res.status(200).json({
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get global notifications (for admin and user, no user-specific notification)
 */
exports.getGlobalNotifications = async (req, res) => {
    try {
        const notifications = await notificationService.getGlobalNotifications();
        
        res.status(200).json({
            message: 'Global notifications retrieved successfully',
            notifications
        });
    } catch (error) {
        console.error('Error fetching global notifications:', error);
        res.status(500).json({ message: 'Server error' });
    }
};