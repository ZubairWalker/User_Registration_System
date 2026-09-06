import mongoose,{ Schema } from 'mongoose';

const registrationSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        minlength: [3, 'Full name must be at least 3 characters long'],
        maxlength: [30, 'Full name must be at most 30 characters long'],
    },
    email: {
        type: String,
        required: true,
        unique: true,
        minlength: [5, 'Email must be at least 5 characters long'],
        maxlength: [50, 'Email must be at most 50 characters long'],
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
        set: (email: string) => email.toLowerCase(),
        validate: {
            validator: async function (this: any, value: string) {
                if(!this.isNew) return true;
                const exits = await this.constructor.findOne({email: value});
                return !exits;
            },
            message: "Email Already Exists, please Choose a different email address"
        }
    },
    passwordHash: {
        type: String,
        required: true,
        minlength: [60, 'Password must be at least 60 characters long'],
        maxlength: [60, 'Password must be at most 60 characters long'],
    },
    isVerified: {
        type: Boolean,
        default: false, 
    },
    verificationToken: {
        type: String,
    },
    verificationTokenExpiry: {
        type: Date
    },
})

export default mongoose.model('Registration', registrationSchema);