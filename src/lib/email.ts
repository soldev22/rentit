import { Resend } from 'resend';

export async function sendPasswordResetEmail({
  to,
  token,
}: {
  to: string;
  token: string;
}) {
  // Lazily initialize Resend to avoid build-time errors
  const resend = new Resend(process.env.RESEND_API_KEY);
  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/password-reset/confirm?token=${token}`;
  const subject = 'Reset your RentIT password';
  const html = `
    <p>Hello,</p>
    <p>You requested a password reset for your RentIT account.</p>
    <p><a href="${resetUrl}">Click here to reset your password</a></p>
    <p>If you did not request this, you can ignore this email.</p>
    <p>Thanks,<br/>The RentIT Team</p>
  `;
  return resend.emails.send({
    from: 'RentIT <https://rentit-nine.vercel.app/>',
    to,
    subject,
    html,
  });
}
