const Notification = require('../models/notificationModel')

/**
 * Service for handling notifications
 */
class NotificationService {
  /**
   * Create a global notification for all users
   * @param {Object} notificationData - The notification data
   * @returns {Promise<Object>} - The created notification
   */
  async createGlobalNotification(notificationData) {
    try {
      const notification = new Notification({
        title: notificationData.title,
        description: notificationData.description,
        type: 'global',
        resourceType: notificationData.resourceType || 'other',
        resourceId: notificationData.resourceId || null
      });

      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating global notification:', error);
      throw error;
    }
  }

  /**
   * Create a notification for a specific user
   * @param {String} userId - The user ID
   * @param {Object} notificationData - The notification data
   * @returns {Promise<Object>} - The created notification
   */
  async createUserNotification(userId, notificationData) {
    try {
      const notification = new Notification({
        title: notificationData.title,
        description: notificationData.description,
        type: 'user-specific',
        userId: userId,
        resourceType: notificationData.resourceType || 'other',
        resourceId: notificationData.resourceId || null
      });

      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating user notification:', error);
      throw error;
    }
  }

  /**
   * Get all global notifications
   * @returns {Promise<Array>} - List of global notifications
   */
  async getGlobalNotifications() {
    try {
      return await Notification.find({ type: 'global' }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error fetching global notifications:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a specific user, including global notifications
   * @param {String} userId - The user ID
   * @returns {Promise<Array>} - List of notifications for the user
   */
  async getUserNotifications(userId) {
    try {
      return await Notification.find({
        $or: [
          { type: 'global' },
          { type: 'user-specific', userId: userId }
        ]
      }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param {String} notificationId - The notification ID
   * @returns {Promise<Object>} - The updated notification
   */
  async markAsRead(notificationId) {
    try {
      return await Notification.findByIdAndUpdate(notificationId, 
        { isRead: true }, 
        { new: true }
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications for a user as read
   * @param {String} userId - The user ID
   * @returns {Promise<Object>} - Result of the update operation
   */
  async markAllAsRead(userId) {
    try {
      return await Notification.updateMany(
        { 
          $or: [
            { type: 'global' },
            { type: 'user-specific', userId: userId }
          ],
          isRead: false
        },
        { isRead: true }
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();