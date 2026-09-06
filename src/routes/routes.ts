import express from 'express';
import { type Response, type Request } from 'express';
import authRouter from './auth.js';
const router = express.Router()

router.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'Welcome to User Registration System'
    })
})

router.use('/api/auth', authRouter);

export default router