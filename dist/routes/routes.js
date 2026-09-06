import express from 'express';
import authRouter from './auth.js';
const router = express.Router();
router.get('/', (req, res) => {
    res.json({
        message: 'Welcome to User Registration System'
    });
});
router.use('/api/auth', authRouter);
export default router;
