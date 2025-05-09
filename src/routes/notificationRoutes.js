const express = require('express');
const router = express.Router();
const { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, getGlobalNotifications } = require('../controllers/notificationController')
const authMiddleware = require('../middlewares/authMiddleware');

router.get(
    '/user',
    authMiddleware,
    getUserNotifications
);

router.put(
    '/read/:notificationId',
    authMiddleware,
    markNotificationAsRead
);

router.put(
    '/read-all',
    authMiddleware,
    markAllNotificationsAsRead
);

router.get(
    '/global',
    authMiddleware,
    getGlobalNotifications
);

module.exports = router;