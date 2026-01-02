
import { Resend } from 'resend';

export async function sendPasswordResetEmail({
  to,
  token,
  subject,
  html,
}: {
  to: string;
  token: string;
  subject?: string;
  html?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  let emailSubject = subject;
  let emailHtml = html;
  if (!subject || !html) {
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/password-reset/confirm?token=${token}`;
    emailSubject = 'Reset your Rentsimple password';
    emailHtml = `
      <p>Hello,</p>
      <p>You requested a password reset for your Rentsimple account.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>Thanks,<br/>The Rentsimple Team</p>
    `;
  }
  return resend.emails.send({
    from: 'Rentsimple <mike@solutionsdeveloped.co.uk>',
    to,
    subject: emailSubject ?? '',
    html: emailHtml ?? '',
  } as any);
}
