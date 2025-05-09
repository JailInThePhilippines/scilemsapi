const Admin = require('../models/adminModel');
const User = require('../models/userModel');
const AuthController = require('./authController');
const Equipment = require('../models/equipmentModel');
const Transaction = require('../models/transactionModel');
const Cart = require('../models/cartModel');
const { validationResult } = require('express-validator');
const { markOverdueItemsAsPending } = require('../utils/scheduleJobs');
const notificationService = require('../utils/notificationService');
const transactionLogger = require('../utils/transactionLogger');
const Logbook = require('../models/logBookModel');

exports.createAdmin = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const existingUser = await Admin.findOne({
            $or: [{ username: req.body.username }]
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Admin with this username already exists' });
        }

        const admin = await AuthController.register(Admin, req.body);

        res.status(201).json({
            message: 'Admin created successfully',
            admin
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.loginAdmin = async (req, res) => {
    req.userModel = Admin;
    return AuthController.login(req, res);
};

exports.refreshToken = async (req, res) => {
    req.userModel = Admin;
    return AuthController.refreshToken(req, res);
}

exports.logout = async (req, res) => {
    req.userModel = Admin;
    return AuthController.logout(req, res);
}

exports.getAdminDetails = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user._id).select('-password -refreshToken');

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        res.status(200).json({
            message: 'Admin details retrieved successfully',
            admin
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstname, middlename, lastname } = req.body;

        if (!firstname || !lastname) {
            return res.status(400).json({ message: 'Firstname and lastname are required.' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            {
                firstname,
                middlename,
                lastname,
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        ).select('-password -refreshToken');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({
            message: 'User details updated successfully.',
            user: updatedUser
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAllBorrowedItemsDetailsForAdmin = async (req, res) => {
    try {
        const transactions = await Transaction.find({ currentStatus: 'applying' })
            .select('borrowedItems currentStatus dataApplied dateApproved pickUpDate dateBorrowed returnDate dateReturned dateArchived lastStatus remarks createdAt updatedAt cartID')
            .populate({
                path: 'cartID',
                select: 'brID',
                populate: {
                    path: 'brID',
                    model: 'User',
                    select: 'firstname middlename lastname suffix'
                }
            })
            .populate({
                path: 'borrowedItems.eqID',
                select: '_id catID name stock description image ytLink dateAdded dateUpdated'
            })
            .lean()
            .sort({ createdAt: -1 });

        for (const txn of transactions) {
            if (txn.cartID && txn.cartID.brID) {
                const user = txn.cartID.brID;
                txn.borrowerName = `${user.firstname} ${user.middlename || ''} ${user.lastname}${user.suffix ? ' ' + user.suffix : ''}`.trim();
            } else {
                txn.borrowerName = 'Unknown';
            }
        }

        return res.status(200).json({ transactions });
    } catch (error) {
        console.error('Error fetching applying borrowed items for admin:', error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAllApprovedTransactions = async (req, res) => {
    try {
        const approvedTransactions = await Transaction.find({ currentStatus: 'approved' })
            .populate({
                path: 'cartID',
                select: 'brID',
                populate: {
                    path: 'brID',
                    model: 'User',
                    select: 'firstname middlename lastname suffix'
                }
            })
            .populate({
                path: 'borrowedItems.eqID',
                select: 'name'
            })
            .lean()
            .sort({ dateApproved: -1 });

        for (const txn of approvedTransactions) {
            const user = txn.cartID?.brID;
            txn.borrowerName = user
                ? `${user.firstname} ${user.middlename || ''} ${user.lastname}${user.suffix ? ' ' + user.suffix : ''}`.trim()
                : 'Unknown';
        }

        res.status(200).json({ transactions: approvedTransactions });
    } catch (error) {
        console.error('Error fetching approved transactions:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.confirmApplication = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { pickUpDate } = req.body;

        const transaction = await Transaction.findById(transactionId).populate({
            path: 'cartID',
            populate: {
                path: 'brID',
                model: 'User'
            }
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const updateData = {
            $set: {
                currentStatus: 'approved',
                dateApproved: new Date(),
                pickUpDate: pickUpDate ? new Date(pickUpDate) : null
            }
        };

        await transactionLogger.logStatusChange(transaction, updateData, 'approved');

        const updatedTransaction = await Transaction.findByIdAndUpdate(
            transactionId,
            updateData,
            { new: true }
        ).populate({
            path: 'cartID',
            populate: {
                path: 'brID',
                model: 'User'
            }
        });

        const userId = updatedTransaction.cartID.brID;

        await notificationService.createUserNotification(
            userId,
            {
                title: 'Borrow Request Approved',
                description: `Your borrow request for a ${updatedTransaction.equipmentDetails?.name || 'equipment'} has been approved.`,
                resourceType: 'transaction',
                resourceId: updatedTransaction._id
            }
        );

        res.status(200).json({
            message: 'Application confirmed successfully',
            transaction: updatedTransaction
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.declineApplication = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { remarks } = req.body;

        const transaction = await Transaction.findById(transactionId)
            .populate('borrowedItems.eqID')
            .populate({
                path: 'cartID',
                populate: {
                    path: 'brID',
                    model: 'User'
                }
            });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        for (const item of transaction.borrowedItems) {
            const equipment = item.eqID;
            if (equipment) {
                equipment.stock += item.quantity;
                await equipment.save();
            }
        }

        const updateData = {
            $set: {
                lastStatus: transaction.currentStatus,
                currentStatus: 'declined',
                remarks: remarks || 'No remarks provided',
                dateArchived: new Date()
            }
        };

        await transactionLogger.logStatusChange(transaction, updateData, 'declined');

        transaction.lastStatus = transaction.currentStatus;
        transaction.currentStatus = 'declined';
        transaction.remarks = remarks || 'No remarks provided';
        transaction.dateArchived = new Date();

        await transaction.save();

        const userId = transaction.cartID.brID;

        await notificationService.createUserNotification(
            userId,
            {
                title: 'Borrow Request Declined',
                description: `Your borrow request has been declined. Remarks: ${transaction.remarks}`,
                resourceType: 'transaction',
                resourceId: transaction._id
            }
        );

        res.status(200).json({
            message: 'Application declined and stock restored successfully',
            transaction
        });
    } catch (err) {
        console.error('Error declining application:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.confirmBorrowedStatus = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { returnDate } = req.body;

        if (!returnDate) {
            return res.status(400).json({ message: 'Return date is required.' });
        }

        const transaction = await Transaction.findById(transactionId).populate({
            path: 'cartID',
            populate: {
                path: 'brID',
                model: 'User'
            }
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const now = new Date();

        const updateData = {
            $set: {
                lastStatus: transaction.currentStatus,
                currentStatus: 'borrowed',
                dateBorrowed: now,
                returnDate: new Date(returnDate)
            }
        };

        await transactionLogger.logStatusChange(transaction, updateData, 'borrowed');

        const updatedTransaction = await Transaction.findByIdAndUpdate(
            transactionId,
            updateData,
            { new: true }
        ).populate({
            path: 'cartID',
            populate: {
                path: 'brID',
                model: 'User'
            }
        });

        const userId = updatedTransaction.cartID.brID;

        await notificationService.createUserNotification(
            userId,
            {
                title: 'Items Borrowed',
                description: `You have successfully borrowed the items. Please return them by ${new Date(returnDate).toLocaleDateString()}.`,
                resourceType: 'transaction',
                resourceId: updatedTransaction._id
            }
        );

        return res.status(200).json({
            message: 'Transaction marked as borrowed.',
            transaction: updatedTransaction
        });
    } catch (error) {
        console.error('Error confirming borrowed status:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.declineApproval = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { remarks } = req.body;

        const transaction = await Transaction.findById(transactionId)
            .populate('borrowedItems.eqID')
            .populate({
                path: 'cartID',
                populate: {
                    path: 'brID',
                    model: 'User'
                }
            });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        for (const item of transaction.borrowedItems) {
            const equipment = item.eqID;
            if (equipment) {
                equipment.stock += item.quantity;
                await equipment.save();
            }
        }

        const updateData = {
            $set: {
                lastStatus: transaction.currentStatus,
                currentStatus: 'declined',
                remarks: remarks || 'No remarks provided',
                dateArchived: new Date()
            }
        };

        await transactionLogger.logStatusChange(transaction, updateData, 'declined');

        transaction.lastStatus = transaction.currentStatus;
        transaction.currentStatus = 'declined';
        transaction.remarks = remarks || 'No remarks provided';
        transaction.dateArchived = new Date();

        await transaction.save();

        const userId = transaction.cartID.brID;

        await notificationService.createUserNotification(
            userId,
            {
                title: 'Approval Declined',
                description: `Your approval request was declined. Remarks: ${transaction.remarks}`,
                resourceType: 'transaction',
                resourceId: transaction._id
            }
        );

        res.status(200).json({
            message: 'Approval declined and stock restored successfully',
            transaction
        });
    } catch (err) {
        console.error('Error declining approval:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllBorrowedTransactions = async (req, res) => {
    try {
        const borrowedTransactions = await Transaction.find({ currentStatus: 'borrowed' })
            .populate({
                path: 'cartID',
                select: 'brID',
                populate: {
                    path: 'brID',
                    model: 'User',
                    select: 'firstname middlename lastname suffix'
                }
            })
            .populate({
                path: 'borrowedItems.eqID',
                select: 'name'
            })
            .lean()
            .sort({ dateBorrowed: -1 });

        for (const txn of borrowedTransactions) {
            const user = txn.cartID?.brID;
            txn.borrowerName = user
                ? `${user.firstname} ${user.middlename || ''} ${user.lastname}${user.suffix ? ' ' + user.suffix : ''}`.trim()
                : 'Unknown';
        }

        res.status(200).json({ transactions: borrowedTransactions });
    } catch (error) {
        console.error('Error fetching borrowed transactions:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.confirmReturn = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { dateReturned, remarks } = req.body;

        if (!dateReturned || !remarks) {
            return res.status(400).json({ message: 'Date returned and remarks are required.' });
        }

        const transaction = await Transaction.findById(transactionId).populate({
            path: 'cartID',
            populate: {
                path: 'brID',
                model: 'User'
            }
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const updateData = {
            $set: {
                lastStatus: transaction.currentStatus,
                currentStatus: 'returned',
                dateReturned: new Date(dateReturned),
                remarks: remarks
            }
        };

        await transactionLogger.logStatusChange(transaction, updateData, 'returned');

        const updatedTransaction = await Transaction.findByIdAndUpdate(
            transactionId,
            updateData,
            { new: true }
        ).populate({
            path: 'cartID',
            populate: {
                path: 'brID',
                model: 'User'
            }
        });

        const userId = updatedTransaction.cartID.brID;

        await notificationService.createUserNotification(
            userId,
            {
                title: 'Items Returned',
                description: `Your return has been confirmed. Remarks: ${remarks}`,
                resourceType: 'transaction',
                resourceId: updatedTransaction._id
            }
        );

        return res.status(200).json({
            message: 'Transaction marked as returned.',
            transaction: updatedTransaction
        });
    } catch (error) {
        console.error('Error confirming return status:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.removeBorrowedRecords = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { remarks } = req.body;

        const transaction = await Transaction.findById(transactionId).populate('borrowedItems.eqID');

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        for (const item of transaction.borrowedItems) {
            const equipment = item.eqID;
            if (equipment) {
                equipment.stock += item.quantity;
                await equipment.save();
            }
        }

        const updateData = {
            $set: {
                lastStatus: transaction.currentStatus,
                currentStatus: 'deleted',
                remarks: remarks || 'No remarks provided',
                dateArchived: new Date()
            }
        };

        await transactionLogger.logStatusChange(transaction, updateData, 'deleted');

        transaction.lastStatus = transaction.currentStatus;
        transaction.currentStatus = 'deleted';
        transaction.remarks = remarks || 'No remarks provided';
        transaction.dateArchived = new Date();

        await transaction.save();

        res.status(200).json({
            message: 'Record removed successfully',
            transaction
        });
    } catch (err) {
        console.error('Error removing record:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllReturnedItems = async (req, res) => {
    try {
        const returnedItems = await Transaction.find({ currentStatus: 'returned' })
            .populate({
                path: 'cartID',
                select: 'brID',
                populate: {
                    path: 'brID',
                    model: 'User',
                    select: 'firstname middlename lastname suffix'
                }
            })
            .populate({
                path: 'borrowedItems.eqID',
                select: 'name'
            })
            .lean()
            .sort({ dateReturned: -1 });

        for (const txn of returnedItems) {
            const user = txn.cartID?.brID;
            txn.borrowerName = user
                ? `${user.firstname} ${user.middlename || ''} ${user.lastname}${user.suffix ? ' ' + user.suffix : ''}`.trim()
                : 'Unknown';
        }

        res.status(200).json({ transactions: returnedItems });
    } catch (error) {
        console.error('Error fetching returned items:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAllArchivedRecords = async (req, res) => {
    try {
        const archivedItems = await Transaction.find({ currentStatus: { $in: ['deleted', 'declined'] } })
            .populate({
                path: 'cartID',
                select: 'brID',
                populate: {
                    path: 'brID',
                    model: 'User',
                    select: 'firstname middlename lastname suffix'
                }
            })
            .populate({
                path: 'borrowedItems.eqID',
                select: 'name'
            })
            .lean()
            .sort({ dateArchived: -1 });

        for (const txn of archivedItems) {
            const user = txn.cartID?.brID;
            txn.borrowerName = user
                ? `${user.firstname} ${user.middlename || ''} ${user.lastname}${user.suffix ? ' ' + user.suffix : ''}`.trim()
                : 'Unknown';
        }

        res.status(200).json({ transactions: archivedItems });
    } catch (error) {
        console.error('Error fetching deleted/declined items:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.restoreArchivedRecord = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { remarks } = req.body;

        const transaction = await Transaction.findById(transactionId)
            .populate({
                path: 'cartID',
                populate: {
                    path: 'brID',
                    model: 'User'
                }
            });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (!['deleted', 'declined'].includes(transaction.currentStatus)) {
            return res.status(400).json({ message: 'Transaction is not archived.' });
        }

        const updateData = {
            $set: {
                currentStatus: transaction.lastStatus,
                lastStatus: transaction.currentStatus,
                remarks: remarks || transaction.remarks
            },
            $unset: { dateArchived: "" }
        };

        await transactionLogger.logStatusChange(transaction, updateData, transaction.lastStatus);

        transaction.currentStatus = transaction.lastStatus;
        transaction.lastStatus = transaction.currentStatus;
        transaction.dateArchived = undefined;

        if (remarks) {
            transaction.remarks = remarks;
        }

        await transaction.save();

        const userId = transaction.cartID.brID;

        await notificationService.createUserNotification(
            userId,
            {
                title: 'Transaction Restored',
                description: `Your transaction has been restored. ${remarks ? 'Remarks: ' + remarks : ''}`,
                resourceType: 'transaction',
                resourceId: transaction._id
            }
        );

        res.status(200).json({
            message: 'Transaction successfully restored.',
            transaction
        });
    } catch (error) {
        console.error('Error restoring archived transaction:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.checkAndUpdateOverdueItems = async (req, res) => {
    try {
        const result = await markOverdueItemsAsPending();

        res.status(200).json({
            message: 'Overdue items check completed',
            updatedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error checking overdue items:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAllPendingItems = async (req, res) => {
    try {
        const pendingItems = await Transaction.find({ currentStatus: 'pending' })
            .populate({
                path: 'cartID',
                select: 'brID',
                populate: {
                    path: 'brID',
                    model: 'User',
                    select: 'firstname middlename lastname suffix'
                }
            })
            .populate({
                path: 'borrowedItems.eqID',
                select: 'name'
            })
            .lean()
            .sort({ returnDate: -1 });

        for (const txn of pendingItems) {
            const user = txn.cartID?.brID;
            txn.borrowerName = user
                ? `${user.firstname} ${user.middlename || ''} ${user.lastname}${user.suffix ? ' ' + user.suffix : ''}`.trim()
                : 'Unknown';
        }

        res.status(200).json({ transactions: pendingItems });
    } catch (error) {
        console.error('Error fetching returned items:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getUserCount = async (req, res) => {
    try {
        const count = await User.countDocuments();

        res.status(200).json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getUsersWithBorrowedOrPendingTransactions = async (req, res) => {
    try {
        const result = await Transaction.aggregate([
            {
                $match: {
                    currentStatus: { $in: ['borrowed', 'pending'] }
                }
            },
            {
                $lookup: {
                    from: 'carts',
                    localField: 'cartID',
                    foreignField: '_id',
                    as: 'cart'
                }
            },
            { $unwind: '$cart' },
            {
                $group: {
                    _id: '$cart.brID'
                }
            },
            {
                $count: 'userCount'
            }
        ]);

        const count = result[0]?.userCount || 0;

        res.status(200).json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getEquipmentBorrowedAndReturnedCount = async (req, res) => {
    try {
        const borrowedResult = await Transaction.aggregate([
            {
                $match: {
                    currentStatus: 'borrowed'
                }
            },
            { $unwind: '$borrowedItems' },
            {
                $group: {
                    _id: '$borrowedItems.eqID',
                    totalBorrowed: { $sum: '$borrowedItems.quantity' }
                }
            }
        ]);

        const returnedResult = await Transaction.aggregate([
            {
                $match: {
                    currentStatus: 'returned'
                }
            },
            { $unwind: '$borrowedItems' },
            {
                $group: {
                    _id: '$borrowedItems.eqID',
                    totalReturned: { $sum: '$borrowedItems.quantity' }
                }
            }
        ]);

        const totalBorrowed = borrowedResult.reduce((sum, eq) => sum + eq.totalBorrowed, 0);
        const totalReturned = returnedResult.reduce((sum, eq) => sum + eq.totalReturned, 0);

        res.status(200).json({
            totalBorrowed,
            totalReturned
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getEquipmentCountPerCategory = async (req, res) => {
    try {
        const result = await Equipment.aggregate([
            {
                $lookup: {
                    from: 'categories',
                    localField: 'catID',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $group: {
                    _id: '$category.name',
                    equipmentCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    category: '$_id',
                    equipmentCount: 1,
                    _id: 0
                }
            },
            { $sort: { category: 1 } }
        ]);

        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getMonthlyBorrowerCounts = async (req, res) => {
    try {
        const result = await Logbook.aggregate([
            {
                $match: {
                    currentStatus: 'borrowed',
                    dateBorrowed: { $ne: null }
                }
            },
            {
                $lookup: {
                    from: 'carts',
                    localField: 'cartID',
                    foreignField: '_id',
                    as: 'cart'
                }
            },
            { $unwind: '$cart' },
            {
                $addFields: {
                    yearMonth: {
                        $dateToString: { format: "%Y-%m", date: "$dateBorrowed" }
                    }
                }
            },
            {
                $group: {
                    _id: "$yearMonth",
                    borrowerCount: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            },
            {
                $project: {
                    month: '$_id',
                    borrowerCount: 1,
                    _id: 0
                }
            }
        ]);

        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
