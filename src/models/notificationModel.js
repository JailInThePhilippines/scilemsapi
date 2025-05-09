const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['global', 'user-specific'],
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: function () {
            return this.type === 'user-specific';
        }
    },
    resourceType: {
        type: String,
        enum: ['equipment', 'transaction', 'application', 'other', 'category'],
        default: 'other'
    },
    resourceId: {
        type: Schema.Types.ObjectId,
        required: false
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;