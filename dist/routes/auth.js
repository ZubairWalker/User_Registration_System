import express from 'express';
import { getUserProfile, getUserIdFromAuthToken, loginUser, registerUser, updateUserProfile, verifyEmail, } from '../services/registrationService.js';
const authRouter = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function requireAuthentication(req, res, next) {
    const header = req.header('Authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
    const userId = getUserIdFromAuthToken(token);
    if (!userId) {
        res.status(401).json({ message: 'A valid bearer token is required' });
        return;
    }
    res.locals.userId = userId;
    next();
}
function handleError(error, res) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    const status = message.includes('already exists') ? 409 : 400;
    res.status(status).json({ message });
}
function validateRegistration(body) {
    if (typeof body.fullName !== 'string' || body.fullName.trim().length < 3) {
        return 'Full name must be at least 3 characters long';
    }
    if (typeof body.email !== 'string' || !emailPattern.test(body.email.trim())) {
        return 'Please enter a valid email address';
    }
    if (typeof body.password !== 'string' || body.password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    return null;
}
authRouter.post('/register', async (req, res) => {
    const error = validateRegistration(req.body);
    if (error) {
        res.status(400).json({ message: error });
        return;
    }
    try {
        const user = await registerUser(req.body);
        res.status(201).json({ message: 'Registration successful. Check your email to verify your account.', user });
    }
    catch (registrationError) {
        handleError(registrationError, res);
    }
});
authRouter.get('/verify-email', async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) {
        res.status(400).json({ message: 'Verification token is required' });
        return;
    }
    try {
        const user = await verifyEmail(token);
        res.json({ message: 'Email verified successfully', user });
    }
    catch (verificationError) {
        handleError(verificationError, res);
    }
});
authRouter.post('/login', async (req, res) => {
    if (typeof req.body.email !== 'string' || typeof req.body.password !== 'string') {
        res.status(400).json({ message: 'Email and password are required' });
        return;
    }
    try {
        const loginResult = await loginUser(req.body.email, req.body.password);
        res.json({ message: 'Login successful', ...loginResult });
    }
    catch (loginError) {
        res.status(401).json({ message: loginError instanceof Error ? loginError.message : 'Login failed' });
    }
});
authRouter.get('/profile/:id', requireAuthentication, async (req, res, next) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : '';
        if (id !== res.locals.userId) {
            res.status(403).json({ message: 'You can only view your own profile' });
            return;
        }
        const user = await getUserProfile(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({ user });
    }
    catch (error) {
        next(error);
    }
});
authRouter.patch('/profile/:id', requireAuthentication, async (req, res, next) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : '';
        if (id !== res.locals.userId) {
            res.status(403).json({ message: 'You can only update your own profile' });
            return;
        }
        const user = await updateUserProfile(id, req.body);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({ user });
    }
    catch (error) {
        next(error);
    }
});
export default authRouter;
