import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import router from './routes/routes.js';
const app = express();
app.use(express.json());
// router
app.use(router);
// Centralized error handler
app.use((err, req, res, next) => {
    console.error(err);
    if (err.name === 'ValidationError') {
        res.status(400).json({ message: err.message, type: 'Validation' });
        return;
    }
    if (err.name === 'MongoServerError' && err.code === 11000) {
        res.status(409).json({ message: 'An account with this email already exists', type: 'Conflict' });
        return;
    }
    if (err.message === 'An account with this email already exists') {
        res.status(409).json({ message: err.message, type: 'Conflict' });
        return;
    }
    if (err.message && (err.message.includes('verify') || err.message.includes('invalid') || err.message.includes('expired'))) {
        res.status(err.status || 400).json({ message: err.message, type: 'Authentication' });
        return;
    }
    if (err.status) {
        res.status(err.status).json({ message: err.message, type: err.type || 'Error' });
        return;
    }
    res.status(500).json({ message: 'Internal Server Error', type: 'Server' });
});
// PORT 
const PORT = process.env.PORT || 5000;
// connecting the database
export const connectDB = async () => {
    try {
        const mongoDbUrl = process.env.MONGO_DB;
        if (!mongoDbUrl) {
            throw new Error('MONGO_DB is not configured.');
        }
        await mongoose.connect(mongoDbUrl);
        console.log('MongoDB connected successfully');
    }
    catch (error) {
        console.error('Error connecting to MongoDB', error);
        throw error;
    }
};
export async function startServer() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
if (process.env.NODE_ENV !== 'test') {
    startServer().catch(() => process.exit(1));
}
export default app;
