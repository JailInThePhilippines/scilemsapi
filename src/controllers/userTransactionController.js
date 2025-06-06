const User = require('../models/userModel');
const AuthController = require('./authController');
const Cart = require('../models/cartModel');
const Equipment = require('../models/equipmentModel');
const Transaction = require('../models/transactionModel');
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

        const cart = await Cart.findOne({ brID: userId });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty or not found' });
        }

        const borrowedItemsSnapshot = cart.items.map(item => ({
            eqID: item.eqID,
            quantity: item.quantity,
            dateOrdered: item.dateOrdered
        }));

        const transaction = new Transaction({
            cartID: cart._id,
            borrowedItems: borrowedItemsSnapshot,
            currentStatus: 'applying',
            dataApplied: new Date()
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

exports.getBorrowedItemsDetails = async (req, res) => {
    try {
        const userId = req.user.id;

        const transactions = await Transaction.find()
            .select('borrowedItems currentStatus dataApplied createdAt updatedAt cartID remarks dateApproved dateBorrowed dateReturned remarks returnDate')
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

        const deleted = await Transaction.findByIdAndDelete(transactionId);

        if (!deleted) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        res.status(200).json({ message: 'Transaction cancelled successfully' });
    } catch (error) {
        console.error('Cancel error:', error);
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
