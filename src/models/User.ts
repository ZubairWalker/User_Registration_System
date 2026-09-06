import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            minlength: [3, 'Full name must be at least 3 characters long'],
            maxlength: [60, 'Full name must be at most 60 characters long'],
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: [100, 'Email must be at most 100 characters long'],
        },
        passwordHash: {
            type: String,
            required: true,
            select: false,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        verificationTokenHash: String,
        verificationTokenExpiry: Date,
    },
    { timestamps: true }
);

export type UserDocument = mongoose.InferSchemaType<typeof userSchema> & {
    _id: mongoose.Types.ObjectId;
};

export default mongoose.model('User', userSchema);
