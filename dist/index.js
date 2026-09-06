import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import router from './routes/routes.js';
const app = express();
app.use(express.json());
// router
app.use(router);
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
