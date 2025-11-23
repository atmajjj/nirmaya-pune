import { createTransporter, EMAIL_SENDER, APP_NAME } from './emailConfig';

interface InvitationEmailParams {
    to: string;
    firstName: string;
    email: string;
    password: string;
    inviteLink: string;
}

export const sendInvitationEmail = async ({
    to,
    firstName,
    email,
    password,
    inviteLink
}: InvitationEmailParams): Promise<void> => {
    const transporter = createTransporter();
    
    const mailOptions = {
        from: `"${APP_NAME}" <${EMAIL_SENDER}>`,
        to,
        subject: `You're Invited to Join ${APP_NAME}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to ${APP_NAME}!</h2>
                <p>Hi ${firstName},</p>
                <p>You've been invited to join ${APP_NAME}. Here are your login credentials:</p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Password:</strong> ${password}</p>
                </div>
                <p>Please click the button below to complete your registration:</p>
                <p style="text-align: center;">
                    <a href="${inviteLink}" 
                       style="display: inline-block; background: #1a73e8; color: white; 
                              padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                        Complete Registration
                    </a>
                </p>
                <p style="color: #d73a49; font-weight: bold;">
                    Important: Please change your password after first login for security.
                </p>
                <p style="color: #666;">This link will expire in 24 hours.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">
                    If you did not expect this invitation, please ignore this email.
                </p>
            </div>
        `
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Invitation email sent successfully to ${to}. Message ID: ${info.messageId}`);
    } catch (error) {
        console.error('Failed to send invitation email:', error);
        throw new Error(`Email service error: ${error instanceof Error ? error.message : String(error)}`);
    }
};