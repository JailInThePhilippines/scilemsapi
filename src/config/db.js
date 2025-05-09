const mongoose = require('mongoose');
mongoose.connection.setMaxListeners(15);

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        console.log('MongoDB is already connected...');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        mongoose.connection.on('error', err => {
            console.error('MongoDB connection error:', err);
        });

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('SIGQUIT', cleanup);

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

function cleanup() {
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    });
}

module.exports = connectDB;