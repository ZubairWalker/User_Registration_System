import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import User, { type UserDocument } from '../models/User.js';
import { sendVerificationEmail } from '../utils/emailService.js';

const PASSWORD_ROUNDS = 12;
const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

export type RegisterInput = {
    fullName: string;
    email: string;
    password: string;
};

export type PublicUser = {
    id: string;
    fullName: string;
    email: string;
    isVerified: boolean;
};

export type LoginResult = {
    user: PublicUser;
    token: string;
};

function toPublicUser(user: UserDocument): PublicUser {
    return {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        isVerified: user.isVerified,
    };
}

function createToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function getAuthSecret(): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error('AUTH_SECRET environment variable is required');
    }
    return secret;
}

export function createAuthToken(userId: string): string {
    const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now() + TOKEN_LIFETIME_MS })).toString('base64url');
    const signature = crypto.createHmac('sha256', getAuthSecret()).update(payload).digest('base64url');
    return `${payload}.${signature}`;
}

export function getUserIdFromAuthToken(token: string): string | null {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expectedSignature = crypto.createHmac('sha256', getAuthSecret()).update(payload).digest('base64url');
    if (signature.length !== expectedSignature.length) return null;
    const signaturesMatch = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
    if (!signaturesMatch) return null;

    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
            userId?: string;
            expiresAt?: number;
        };
        return data.userId && data.expiresAt && data.expiresAt > Date.now() ? data.userId : null;
    } catch {
        return null;
    }
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_ROUNDS);
    const verificationToken = createToken();
    const user = await User.create({
        fullName,
        email,
        passwordHash,
        verificationTokenHash: hashToken(verificationToken),
        verificationTokenExpiry: new Date(Date.now() + TOKEN_LIFETIME_MS),
    });

    await sendVerificationEmail(email, verificationToken);
    return toPublicUser(user);
}

export async function verifyEmail(token: string): Promise<PublicUser> {
    const user = await User.findOne({
        verificationTokenHash: hashToken(token),
        verificationTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
        throw new Error('The verification link is invalid or has expired');
    }

    user.isVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();
    return toPublicUser(user);
}

export async function loginUser(email: string, password: string): Promise<LoginResult> {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new Error('Invalid email or password');
    }

    if (!user.isVerified) {
        throw new Error('Please verify your email before logging in');
    }

    const publicUser = toPublicUser(user);
    return { user: publicUser, token: createAuthToken(publicUser.id) };
}

export async function getUserProfile(id: string): Promise<PublicUser | null> {
    const user = await User.findById(id);
    return user ? toPublicUser(user) : null;
}

export async function updateUserProfile(
    id: string,
    changes: { fullName?: string; email?: string }
): Promise<PublicUser | null> {
    const user = await User.findById(id);
    if (!user) return null;

    if (changes.fullName !== undefined) {
        user.fullName = changes.fullName.trim();
    }

    if (changes.email !== undefined) {
        const newEmail = changes.email.trim().toLowerCase();
        if (newEmail !== user.email) {
            const existing = await User.findOne({ email: newEmail });
            if (existing) {
                const error = new Error('An account with this email already exists');
                (error as any).status = 409;
                throw error;
            }
            user.email = newEmail;
            user.isVerified = false;
            const verificationToken = createToken();
            user.verificationTokenHash = hashToken(verificationToken);
            user.verificationTokenExpiry = new Date(Date.now() + TOKEN_LIFETIME_MS);
            await sendVerificationEmail(newEmail, verificationToken);
        }
    }
    await user.save();
    return user ? toPublicUser(user) : null;
}

export async function resendVerificationEmail(email: string): Promise<void> {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return;
    if (user.isVerified) {
        const err = new Error('Email is already verified');
        (err as any).status = 400;
        throw err;
    }
}