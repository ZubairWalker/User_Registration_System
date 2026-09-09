import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import {
    createAuthToken,
    getUserIdFromAuthToken,
    registerUser,
    loginUser,
    updateUserProfile,
    resendVerificationEmail,
} from '../services/registrationService.js';

describe('registrationService Unit Tests', () => {
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    const testFullName = 'Test Developer';

    before(async () => {
        process.env.NODE_ENV = 'test';
        if (!process.env.AUTH_SECRET) {
            process.env.AUTH_SECRET = 'test-secret-key-1234567890';
        }
        if (mongoose.connection.readyState === 0 && process.env.MONGO_DB) {
            await mongoose.connect(process.env.MONGO_DB);
        }
    });

    after(async () => {
        try {
            await User.deleteMany({ email: { $regex: /^test_/i } });
        } catch {
            // ignore cleanup errors
        }
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });

    describe('Auth Token generation and verification', () => {
        test('creates a valid bearer token and extracts userId correctly', () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const token = createAuthToken(fakeId);
            assert.ok(typeof token === 'string');
            assert.ok(token.includes('.'));

            const extractedId = getUserIdFromAuthToken(token);
            assert.equal(extractedId, fakeId);
        });

        test('returns null for tampered or malformed tokens', () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const token = createAuthToken(fakeId);
            const [payload, signature] = token.split('.');

            assert.equal(getUserIdFromAuthToken('invalid-token'), null);
            assert.equal(getUserIdFromAuthToken(`${payload}.forged_signature`), null);
            assert.equal(getUserIdFromAuthToken(''), null);
        });
    });

    describe('User Registration & Verification Flow', () => {
        test('registers a new user with unverified status and token hash', async () => {
            const user = await registerUser({
                fullName: testFullName,
                email: testEmail,
                password: testPassword,
            });

            assert.equal(user.fullName, testFullName);
            assert.equal(user.email, testEmail.toLowerCase());
            assert.equal(user.isVerified, false);

            const doc = await User.findOne({ email: testEmail.toLowerCase() });
            assert.ok(doc);
            assert.ok(doc.verificationTokenHash);
            assert.ok(doc.verificationTokenExpiry);
            assert.ok(doc.lastVerificationSentAt);
        });

        test('fails to register duplicate email', async () => {
            await assert.rejects(
                async () => {
                    await registerUser({
                        fullName: testFullName,
                        email: testEmail,
                        password: testPassword,
                    });
                },
                { message: 'An account with this email already exists' }
            );
        });

        test('fails login before email is verified', async () => {
            await assert.rejects(
                async () => {
                    await loginUser(testEmail, testPassword);
                },
                { message: 'Please verify your email before logging in' }
            );
        });
    });

    describe('resendVerificationEmail behavior', () => {
        test('returns void silently on non-happy path: user does not exist', async () => {
            const result = await resendVerificationEmail('nonexistent_user_99999@example.com');
            assert.equal(result, undefined);
        });

        test('returns void silently on non-happy path: cooldown is active', async () => {
            const doc = await User.findOne({ email: testEmail.toLowerCase() });
            assert.ok(doc);
            const initialHash = doc.verificationTokenHash;

            // Immediately resend with a 60-second cooldown -> should do nothing (silent return)
            const result = await resendVerificationEmail(testEmail, 60000);
            assert.equal(result, undefined);

            const reloaded = await User.findOne({ email: testEmail.toLowerCase() });
            assert.equal(reloaded?.verificationTokenHash, initialHash);
        });

        test('happy path: issues fresh token, invalidating old hash, and saves before sending', async () => {
            const doc = await User.findOne({ email: testEmail.toLowerCase() });
            assert.ok(doc);
            const initialHash = doc.verificationTokenHash;

            // Resend with 0 cooldown override to simulate expired cooldown
            await resendVerificationEmail(testEmail, 0);

            const updatedDoc = await User.findOne({ email: testEmail.toLowerCase() });
            assert.ok(updatedDoc);
            assert.notEqual(updatedDoc.verificationTokenHash, initialHash, 'Old token hash must be overwritten');
            assert.ok(updatedDoc.lastVerificationSentAt);
        });

        test('returns void silently on non-happy path: user is already verified', async () => {
            // Find current user and verify them
            const doc = await User.findOne({ email: testEmail.toLowerCase() });
            assert.ok(doc);
            doc.isVerified = true;
            await doc.save();

            // Calling resend on verified user should silently return void
            const result = await resendVerificationEmail(testEmail, 0);
            assert.equal(result, undefined);
        });
    });

    describe('Profile updates and email change re-verification', () => {
        test('updating email revokes verification status and generates fresh token', async () => {
            const doc = await User.findOne({ email: testEmail.toLowerCase() });
            assert.ok(doc);
            assert.equal(doc.isVerified, true);

            const newEmail = `test_updated_${Date.now()}@example.com`;
            const updated = await updateUserProfile(doc._id.toString(), { email: newEmail });

            assert.ok(updated);
            assert.equal(updated.email, newEmail.toLowerCase());
            assert.equal(updated.isVerified, false, 'Changing email must revoke verification status');

            const reloaded = await User.findById(doc._id);
            assert.ok(reloaded);
            assert.equal(reloaded.isVerified, false);
            assert.ok(reloaded.verificationTokenHash);
        });
    });
});
