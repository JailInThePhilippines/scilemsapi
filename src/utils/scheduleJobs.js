const schedule = require('node-schedule');
const Transaction = require('../models/transactionModel');

/**
 * Note (important): This function schedules a daily job to check for overdue items and mark them as pending.
 */
function scheduleOverdueItemsCheck() {
    schedule.scheduleJob('0 0 * * *', async function () {
        try {
            console.log('Running scheduled job: Check for overdue items');
            await markOverdueItemsAsPending();
        } catch (error) {
            console.error('Error in scheduled overdue items check:', error);
        }
    });
}

/**
 * Mark all overdue borrowed items as "pending"
 */
async function markOverdueItemsAsPending() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTransactions = await Transaction.updateMany(
        {
            currentStatus: 'borrowed',
            returnDate: { $lt: today }
        },
        {
            $set: {
                currentStatus: 'pending',
                lastStatus: 'borrowed'
            }
        }
    );

    console.log(`Updated ${overdueTransactions.modifiedCount} overdue transactions to 'pending' status`);

    return overdueTransactions;
}

module.exports = {
    scheduleOverdueItemsCheck,
    markOverdueItemsAsPending
};