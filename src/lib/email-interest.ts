import { Resend } from 'resend';
import { getCollection } from './db';

export async function sendInterestEmail({
  landlordEmail,
  applicantName,
  applicantEmail,
  applicantTel,
  propertyTitle
}: {
  landlordEmail: string;
  applicantName: string;
  applicantEmail: string;
  applicantTel?: string;
  propertyTitle: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Email to landlord
  await resend.emails.send({
    from: 'Rentsimple <mike@solutionsdeveloped.co.uk>',
    to: landlordEmail,
    subject: `New interest registered for your property: ${propertyTitle}`,
    html: `
      <p>Hello,</p>
      <p>A new applicant has registered interest in your property <b>${propertyTitle}</b>.</p>
      <p><b>Name:</b> ${applicantName}<br/>
         <b>Email:</b> ${applicantEmail}<br/>
         ${applicantTel ? `<b>Tel:</b> ${applicantTel}<br/>` : ''}
      </p>
      <p>Log in to your dashboard to view more details.</p>
      <p>Thanks,<br/>The Rentsimple Team</p>
    `
  });

  // Email to applicant
  await resend.emails.send({
    from: 'Rentsimple <mike@solutionsdeveloped.co.uk>',
    to: applicantEmail,
    subject: `Your interest in ${propertyTitle} has been registered`,
    html: `
      <p>Hello ${applicantName},</p>
      <p>Thank you for registering your interest in <b>${propertyTitle}</b>.</p>
      <p>The landlord has been notified and may contact you soon.</p>
      <p>Thanks,<br/>The Rentsimple Team</p>
    `
  });
}
