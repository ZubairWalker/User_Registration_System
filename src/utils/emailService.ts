import nodemailer from 'nodemailer';

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `http://localhost:${process.env.PORT || 5000}/api/auth/verify-email?token=${token}`;

    if (process.env.NODE_ENV === 'test') {
        return;
    }

    try {
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });

        const info = await transporter.sendMail({
            from: '"User Registration" <noreply@example.com>',
            to: email,
            subject: 'Verify your email address',
            text: `Please verify your email by clicking the following link: ${verificationUrl}`,
            html: `<p>Please verify your email by clicking the following link: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
        });

        console.log(`Verification email sent for ${email}. Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } catch {
        console.log(`Verification email for ${email}: ${verificationUrl}`);
    }
}
