export async function sendVerificationEmail(email, token) {
    const verificationUrl = `http://localhost:${process.env.PORT || 5000}/api/auth/verify-email?token=${token}`;
    // This keeps the project easy to run locally. A real app would call an email provider here.
    console.log(`Verification email for ${email}: ${verificationUrl}`);
}
