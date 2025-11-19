import {nanoid} from 'nanoid';
import {render} from '@react-email/render';
import {createTransport, SendMailOptions} from 'nodemailer';
import {db} from '@/lib/db';
import {PasswordResetEmail} from '@/emails/password-reset';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import React from "react";

export interface PasswordResetOptions {
    email: string;
    resetBaseUrl?: string;
}

export interface SendPasswordResetEmailResult {
    success: boolean;
    userId?: string;
    message: string;
}

/**
 * Creates a password reset token and sends a reset email
 */
export async function createPasswordResetAndSendEmail(options: PasswordResetOptions): Promise<SendPasswordResetEmailResult> {
    try {
        const {email, resetBaseUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`} = options;

        // Check if password reset is enabled in system settings
        const systemConfig = await db.systemConfig.findFirst({
            where: {id: 1}
        });

        if (!systemConfig || !systemConfig.enablePasswordReset) {
            return {
                success: false,
                message: 'Password reset functionality is not enabled on this system'
            };
        }

        // Check if system has SMTP configured
        if (!systemConfig.smtpHost || !systemConfig.smtpPort || !systemConfig.systemEmail) {
            return {
                success: false,
                message: 'System email configuration is incomplete'
            };
        }

        // Find user by email
        const user = await db.user.findUnique({
            where: {email: email.toLowerCase()}
        });

        if (email.toLowerCase().endsWith('@changerawr.sys')) {
            return {
                success: false,
                message: 'System accounts cannot receive password reset emails.'
            } satisfies SendPasswordResetEmailResult
        }


        if (!user) {
            // Don't reveal that the user doesn't exist for security
            return {
                success: true,
                message: 'If a user with this email exists, a password reset email has been sent'
            };
        }

        // Invalidate any existing reset tokens for this user
        await db.passwordReset.updateMany({
            where: {
                userId: user.id,
                usedAt: null
            },
            data: {
                usedAt: new Date()
            }
        });

        // Create a new reset token (expires in 60 minutes)
        const token = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 60);

        await db.passwordReset.create({
            data: {
                token,
                userId: user.id,
                email: user.email,
                expiresAt
            }
        });

        // Create reset link
        const resetLink = `${resetBaseUrl}/${token}`;

        // Set up SMTP transport
        const transporterOptions: SMTPTransport.Options = {
            host: systemConfig.smtpHost,
            port: systemConfig.smtpPort!,
            secure: systemConfig.smtpSecure || false,
            auth: systemConfig.smtpUser && systemConfig.smtpPassword
                ? {
                    user: systemConfig.smtpUser,
                    pass: systemConfig.smtpPassword,
                }
                : undefined,
            tls: {
                rejectUnauthorized: systemConfig.smtpSecure || false,
            },
        };

        const transporter = createTransport(transporterOptions);

        // Generate email
        const emailComponent = PasswordResetEmail({
            resetLink,
            recipientName: user.name || undefined,
            recipientEmail: user.email,
            expiresInMinutes: 60
        });

        const htmlPromise = render(React.isValidElement(emailComponent) ? emailComponent : React.createElement("div"), {pretty: true});
        const textPromise = render(React.isValidElement(emailComponent) ? emailComponent : React.createElement("div"), {plainText: true});

        const html = await htmlPromise;
        const text = await textPromise;

        const mailOptions: SendMailOptions = {
            from: `"Changerawr" <${systemConfig.systemEmail}>`,
            to: user.email,
            subject: 'Reset Your Password',
            text,
            html,
        };

        await transporter.sendMail(mailOptions);

        return {
            success: true,
            userId: user.id,
            message: 'Password reset email sent successfully'
        };
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        return {
            success: false,
            message: 'Failed to send password reset email'
        };
    }
}

/**
 * Validates a password reset token
 */
export async function validatePasswordResetToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    email?: string;
    message?: string;
}> {
    try {
        const passwordReset = await db.passwordReset.findUnique({
            where: {token}
        });

        if (!passwordReset) {
            return {
                valid: false,
                message: 'Invalid or expired reset token'
            };
        }

        if (passwordReset.usedAt) {
            return {
                valid: false,
                message: 'This reset token has already been used'
            };
        }

        if (passwordReset.expiresAt < new Date()) {
            return {
                valid: false,
                message: 'This reset token has expired'
            };
        }

        return {
            valid: true,
            userId: passwordReset.userId,
            email: passwordReset.email
        };
    } catch (error) {
        console.error('Error validating password reset token:', error);
        return {
            valid: false,
            message: 'Error validating password reset token'
        };
    }
}

/**
 * Resets a user's password using a valid token
 */
export async function resetPassword(token: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
}> {
    try {
        // Validate the token
        const validation = await validatePasswordResetToken(token);

        if (!validation.valid || !validation.userId) {
            return {
                success: false,
                message: validation.message || 'Invalid reset token'
            };
        }

        // Hash the new password
        const {hashPassword} = await import('@/lib/auth/password');
        const hashedPassword = await hashPassword(newPassword);

        // Update the user's password
        await db.user.update({
            where: {id: validation.userId},
            data: {password: hashedPassword}
        });

        // Mark the token as used
        await db.passwordReset.update({
            where: {token},
            data: {usedAt: new Date()}
        });

        return {
            success: true,
            message: 'Password reset successful'
        };
    } catch (error) {
        console.error('Error resetting password:', error);
        return {
            success: false,
            message: 'Error resetting password'
        };
    }
}