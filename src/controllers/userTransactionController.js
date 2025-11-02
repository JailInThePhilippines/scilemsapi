const User = require('../models/userModel');
const AuthController = require('./authController');
const Cart = require('../models/cartModel');
const Equipment = require('../models/equipmentModel');
const Transaction = require('../models/transactionModel');
const LabRequest = require('../models/labRequestModel');
const { validationResult } = require('express-validator');

exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { eqID, quantity } = req.body;

        if (!eqID || !quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Invalid equipment or quantity' });
        }

        const equipment = await Equipment.findById(eqID);
        if (!equipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        // Optional: Inform user if they’re adding more than current stock
        if (equipment.stock < quantity) {
            return res.status(400).json({ message: 'Requested quantity exceeds available stock' });
        }

        let cart = await Cart.findOne({ brID: userId });

        if (!cart) {
            cart = new Cart({
                brID: userId,
                items: [{
                    eqID,
                    quantity,
                    dateOrdered: new Date()
                }]
            });
        } else {
            const existingItem = cart.items.find(item => item.eqID.toString() === eqID);

            if (existingItem) {
                existingItem.quantity += quantity;
                existingItem.dateOrdered = new Date();
            } else {
                cart.items.push({ eqID, quantity, dateOrdered: new Date() });
            }
        }

        await cart.save();

        res.status(200).json({ message: 'Item added to cart successfully', cart });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};


exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id;

        const cart = await Cart.findOne({ brID: userId }).populate('items.eqID');

        if (!cart) return res.status(200).json({ items: [] });

        res.status(200).json(cart);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteItemInCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { eqIDs } = req.body;

        if (!Array.isArray(eqIDs) || eqIDs.length === 0) {
            return res.status(400).json({ message: 'No items provided' });
        }

        const cart = await Cart.findOne({ brID: userId });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        let restoredCount = 0;

        for (const eqID of eqIDs) {
            const item = cart.items.find(i => i.eqID.toString() === eqID);
            if (item) {
                // Do NOT restock equipment here
                cart.items = cart.items.filter(i => i.eqID.toString() !== eqID);
                restoredCount++;
            }
        }

        await cart.save();

        res.status(200).json({
            message: `${restoredCount} item(s) removed`,
            cart
        });
    } catch (error) {
        console.error('Error deleting cart items:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.editQuantity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { eqID, newQuantity } = req.body;

        if (!eqID || typeof newQuantity !== 'number' || newQuantity < 1) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const cart = await Cart.findOne({ brID: userId });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const item = cart.items.find(i => i.eqID.toString() === eqID);
        if (!item) return res.status(404).json({ message: 'Item not found in cart' });

        const equipment = await Equipment.findById(eqID);
        if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

        if (newQuantity > equipment.stock) {
            return res.status(400).json({
                message: `Only ${equipment.stock} items available in stock`
            });
        }

        item.quantity = newQuantity;
        item.dateOrdered = new Date();
        await cart.save();

        res.status(200).json({
            message: 'Cart quantity updated successfully',
            cart
        });
    } catch (error) {
        console.error('Error editing quantity:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.borrowItems = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pickUpDate } = req.body;

        const cart = await Cart.findOne({ brID: userId });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty or not found' });
        }

        const borrowedItemsSnapshot = cart.items.map(item => ({
            eqID: item.eqID,
            quantity: item.quantity,
            dateOrdered: item.dateOrdered
        }));

        // Validate pickUpDate if provided
        if (pickUpDate) {
            const picked = new Date(pickUpDate);
            const now = new Date();
            // normalize time for comparison: allow same-day pick up if desired
            if (isNaN(picked.getTime())) {
                return res.status(400).json({ message: 'Invalid pickUpDate' });
            }
            // optional: ensure pickUpDate is not in the past
            if (picked < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
                return res.status(400).json({ message: 'pickUpDate cannot be in the past' });
            }
        }

        const transaction = new Transaction({
            cartID: cart._id,
            borrowedItems: borrowedItemsSnapshot,
            currentStatus: 'applying',
            dataApplied: new Date(),
            pickUpDate: pickUpDate ? new Date(pickUpDate) : undefined
        });

        await transaction.save();

        cart.items = [];
        await cart.save();

        res.status(201).json({
            message: 'Transaction created successfully and cart cleared',
            transaction
        });
    } catch (error) {
        console.error('Error borrowing items:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Create a lab reservation/request
exports.createLabRequest = async (req, res) => {
    try {
        console.log('createLabRequest called by user:', req.user?.id || 'unknown');
        const userId = req.user.id;
        const { lab, title, description, startDate, endDate } = req.body;

        if (!lab || !title || !startDate || !endDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const s = new Date(startDate);
        const e = new Date(endDate);
        if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) {
            return res.status(400).json({ message: 'Invalid start/end date' });
        }

        const labReq = new LabRequest({
            brID: userId,
            lab,
            title,
            description,
            startDate: s,
            endDate: e,
            status: 'pending'
        });

        await labReq.save();

        res.status(201).json({ message: 'Lab request created', labRequest: labReq });
    } catch (error) {
        console.error('Error creating lab request:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get lab requests for borrower view: approved schedules and user's own requests
exports.getLabRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        // all approved schedules (for everyone)
        const approved = await LabRequest.find({ status: 'approved' }).populate('brID', 'firstname lastname');

        // user's own requests (all statuses)
        const mine = await LabRequest.find({ brID: userId }).sort({ createdAt: -1 });

        res.status(200).json({ approved, mine });
    } catch (error) {
        console.error('Error fetching lab requests:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Delete a lab request owned by the authenticated user (only if not approved)
exports.deleteLabRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const reqId = req.params.id;

        const labReq = await LabRequest.findById(reqId);
        if (!labReq) return res.status(404).json({ message: 'Lab request not found' });

        // check ownership
        if (!labReq.brID || labReq.brID.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this request' });
        }

        // disallow deleting approved requests
        if (labReq.status === 'approved') {
            return res.status(400).json({ message: 'Cannot delete an approved request' });
        }

        await LabRequest.findByIdAndDelete(reqId);

        res.status(200).json({ message: 'Lab request deleted' });
    } catch (error) {
        console.error('Error deleting lab request:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getBorrowedItemsDetails = async (req, res) => {
    try {
        const userId = req.user.id;

        const transactions = await Transaction.find()
            .select('borrowedItems currentStatus dataApplied createdAt updatedAt cartID remarks dateApproved dateBorrowed dateReturned returnDate pickUpDate')
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
            .sort({ createdAt: -1 })
            .limit(50);

        const filteredTransactions = [];

        for (const txn of transactions) {
            if (!txn.cartID || !txn.cartID.brID) continue;

            if (txn.cartID.brID._id.toString() === userId) {
                const user = txn.cartID.brID;

                txn.borrowerName = `${user.firstname} ${user.middlename || ''} ${user.lastname}${user.suffix ? ' ' + user.suffix : ''}`.trim();

                filteredTransactions.push(txn);
            }
        }

        return res.status(200).json({ transactions: filteredTransactions });

    } catch (error) {
        console.error('Error fetching borrowed items:', error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.cancelApplication = async (req, res) => {
    try {
        const transactionId = req.params.id;
        const transaction = await Transaction.findById(transactionId).populate({
            path: 'cartID',
            populate: { path: 'brID', model: 'User' }
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Do not allow cancelling if already declined
        if (transaction.currentStatus === 'declined') {
            return res.status(400).json({ message: 'Cannot cancel a declined transaction' });
        }

        await Transaction.findByIdAndDelete(transactionId);

        res.status(200).json({ message: 'Transaction cancelled successfully' });
    } catch (error) {
        console.error('Cancel error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Reset transaction: move items back to user's cart and delete transaction
exports.resetTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const transactionId = req.params.id;

        const transaction = await Transaction.findById(transactionId).populate({
            path: 'cartID',
            populate: { path: 'brID', model: 'User' }
        });

        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        const ownerId = transaction.cartID?.brID?._id?.toString();
        if (!ownerId || ownerId !== userId) {
            return res.status(403).json({ message: 'Not authorized to reset this transaction' });
        }

        // Do not allow resetting if declined
        if (transaction.currentStatus === 'declined') {
            return res.status(400).json({ message: 'Cannot reset a declined transaction' });
        }

        // Find or create user's cart
        let cart = await Cart.findOne({ brID: userId });
        if (!cart) {
            cart = new Cart({ brID: userId, items: [] });
        }

        // Merge items back into cart
        for (const item of transaction.borrowedItems) {
            const eqId = item.eqID._id ? item.eqID._id : item.eqID;
            const existing = cart.items.find(i => i.eqID.toString() === eqId.toString());
            if (existing) {
                existing.quantity += item.quantity;
                existing.dateOrdered = new Date();
            } else {
                cart.items.push({ eqID: eqId, quantity: item.quantity, dateOrdered: new Date() });
            }
        }

        await cart.save();

        // Delete the transaction
        await Transaction.findByIdAndDelete(transactionId);

        res.status(200).json({ message: 'Transaction reset: items moved back to cart', cart });
    } catch (error) {
        console.error('Error resetting transaction:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getMyTransactions = async (req, res) => {
    try {
        const userId = req.user.id;

        const userCarts = await Cart.find({ brID: userId }).select('_id');
        const cartIds = userCarts.map(cart => cart._id);

        const myTransactions = await Transaction.find({ cartID: { $in: cartIds } })
            .populate({
                path: 'cartID',
                select: 'brID',
                populate: {
                    path: 'brID',
                    select: 'firstname middlename lastname'
                }
            })
            .populate({
                path: 'borrowedItems.eqID',
                select: 'name'
            })
            .lean()
            .sort({ dataApplied: -1 });

        res.status(200).json({ transactions: myTransactions });
    } catch (error) {
        console.error('Error fetching user transactions:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updatePickUpDate = async (req, res) => {
    try {
        const userId = req.user.id;
        const transactionId = req.params.id;
        const { pickUpDate } = req.body;

        if (!pickUpDate) {
            return res.status(400).json({ message: 'pickUpDate is required' });
        }

        const picked = new Date(pickUpDate);
        if (isNaN(picked.getTime())) {
            return res.status(400).json({ message: 'Invalid pickUpDate' });
        }

        const now = new Date();
        if (picked < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
            return res.status(400).json({ message: 'pickUpDate cannot be in the past' });
        }

        const transaction = await Transaction.findById(transactionId).populate({
            path: 'cartID',
            populate: {
                path: 'brID',
                model: 'User'
            }
        });

        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        const ownerId = transaction.cartID?.brID?._id?.toString();
        if (!ownerId || ownerId !== userId) {
            return res.status(403).json({ message: 'Not authorized to edit this transaction' });
        }

        // Allow edits only when transaction is still applying or approved (before borrowed)
        const allowedStatuses = ['applying', 'approved'];
        if (!allowedStatuses.includes(transaction.currentStatus)) {
            return res.status(400).json({ message: `Cannot edit pickUpDate when status is '${transaction.currentStatus}'` });
        }

        transaction.pickUpDate = picked;
        await transaction.save();

        res.status(200).json({ message: 'pickUpDate updated', transaction });
    } catch (error) {
        console.error('Error updating pickUpDate:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
