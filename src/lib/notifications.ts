import twilio from 'twilio';
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
const twilioClient = (twilioSid && twilioToken) ? twilio(twilioSid, twilioToken) : null;

import resend from './resend';
// Notification sender for viewing scheduling

type SendResult = {
  email: { attempted: boolean; sent: boolean; to?: string; error?: string };
  landlordEmail: { attempted: boolean; sent: boolean; to?: string; error?: string };
  adminEmail: { attempted: boolean; sent: boolean; to?: string; error?: string };
  sms: { attempted: boolean; sent: boolean; to?: string; error?: string };
};

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return typeof err === 'string' ? err : JSON.stringify(err);
  } catch {
    return String(err);
  }
}

interface ViewingApplication {
  applicantEmail?: string;
  email?: string;
  userEmail?: string;
  applicant?: {
    email?: string;
    phone?: string;
  };
  applicantName?: string;
  applicantTel?: string;
  phone?: string;
  userPhone?: string;
}

export interface PropertyAddress {
  line1: string;
  city: string;
  postcode: string;
}

export interface Property {
  address?: PropertyAddress;
  // Add other property fields as needed
}

export interface Landlord {
  email?: string;
  name?: string;
  phone?: string;
  tel?: string;
  profile?: {
    phone?: string;
    [key: string]: unknown;
  };
  // Add other landlord fields as needed
}

export async function sendViewingNotification(
  application: ViewingApplication,
  details: { date: string; time: string; note?: string; property?: Property; landlord?: Landlord }
) : Promise<SendResult> {
  const result: SendResult = {
    email: { attempted: false, sent: false },
    landlordEmail: { attempted: false, sent: false },
    adminEmail: { attempted: false, sent: false },
    sms: { attempted: false, sent: false },
  };

  // Try to get the best email and phone fields
  const email = application.applicantEmail || application.email || application.userEmail || application.applicant?.email;
  const tel = application.applicantTel || application.phone || application.userPhone || application.applicant?.phone;

  // Compose property address string
  let addressString = '';
  if (details.property && details.property.address) {
    const addr = details.property.address;
    addressString = `${addr.line1}, ${addr.city}, ${addr.postcode}`;
  }

  // Format date as UK (DD/MM/YYYY)
  let ukDate = details.date;
  try {
    const d = new Date(details.date);
    if (!isNaN(d.getTime())) ukDate = d.toLocaleDateString('en-GB');
  } catch {}

  // Landlord contact info
  let landlordPhone = '';
  const landlordEmail = details.landlord?.email;
  const landlordName = details.landlord?.name;
  if (details.landlord) {
    if (details.landlord.phone) landlordPhone = details.landlord.phone;
    else if (details.landlord.tel) landlordPhone = details.landlord.tel;
    else if (details.landlord.profile && details.landlord.profile.phone) landlordPhone = details.landlord.profile.phone;
    else {
      // Debug: log landlord object if no phone found
      console.log('Landlord object missing phone:', details.landlord);
    }
  }

  // Send real email via Resend
  if (email) {
    result.email.attempted = true;
    result.email.to = email;

    if (!process.env.RESEND_API_KEY) {
      result.email.error = 'RESEND_API_KEY is not set';
    } else {
    try {
      let landlordContactLine = '';
      if (landlordPhone) {
        landlordContactLine = `<br><br>If you need to contact the landlord, please call: <b>${landlordPhone}</b>`;
      } else {
        landlordContactLine = `<br><br><b>Landlord contact number not available.</b>`;
      }

      const noteLine = details.note ? `<br><br><b>Note:</b> ${details.note}` : '';
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'NoReply@solutionsdeveloped.co.uk',
        to: email,
        subject: 'Viewing Scheduled',
        html: `<p>Hi,<br><br>Your property viewing is scheduled for <b>${ukDate}</b> at <b>${details.time}</b>.<br>Property: <b>${addressString}</b>${noteLine}<br><br>We're looking forward to meeting you!<br><br><b>Please do not reply to this email.</b>${landlordContactLine}<br><br>If you have any questions or need to reschedule, please call the landlord directly.<br><br>Best regards,<br>The Rentsimple Team</p>`
      });
      console.log(`EMAIL SENT via Resend to ${email}`);
      result.email.sent = true;

      // Landlord confirmation email (send to the scheduling landlord if we have an email)
      if (landlordEmail) {
        result.landlordEmail.attempted = true;
        result.landlordEmail.to = landlordEmail;
        try {
          const applicantLine = application.applicantName
            ? `<br>Applicant: <b>${application.applicantName}</b>`
            : '';
          const applicantEmailLine = email ? `<br>Applicant email: <b>${email}</b>` : '';
          const applicantPhoneLine = tel ? `<br>Applicant phone: <b>${tel}</b>` : '';

          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'NoReply@solutionsdeveloped.co.uk',
            to: landlordEmail,
            subject: `Viewing Scheduled (${ukDate} ${details.time})`,
            html: `<p>Hi${landlordName ? ` ${landlordName}` : ''},<br><br>You scheduled a viewing for <b>${ukDate}</b> at <b>${details.time}</b>.<br>Property: <b>${addressString}</b>${noteLine}${applicantLine}${applicantEmailLine}${applicantPhoneLine}<br><br><b>Please do not reply to this email.</b><br><br>Best regards,<br>The Rentsimple Team</p>`,
          });
          console.log(`LANDLORD CONFIRMATION EMAIL SENT via Resend to ${landlordEmail}`);
          result.landlordEmail.sent = true;
        } catch (err) {
          console.error('Landlord confirmation email error:', err);
          result.landlordEmail.error = toErrorMessage(err);
        }
      } else {
        result.landlordEmail.attempted = false;
        result.landlordEmail.error = 'No landlord email available';
      }

      // Optional: send an admin copy
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        result.adminEmail.attempted = true;
        result.adminEmail.to = adminEmail;
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'NoReply@solutionsdeveloped.co.uk',
            to: adminEmail,
            subject: `COPY: Viewing Scheduled (${ukDate} ${details.time})`,
            html: `<p><b>Admin copy</b><br><br>Viewing scheduled for <b>${ukDate}</b> at <b>${details.time}</b>.<br>Applicant: <b>${application.applicantName || ''}</b><br>Email: <b>${email}</b><br>Phone: <b>${tel || ''}</b><br>Property: <b>${addressString}</b>${noteLine}</p>`,
          });
          console.log(`ADMIN COPY EMAIL SENT via Resend to ${adminEmail}`);
          result.adminEmail.sent = true;
        } catch (err) {
          console.error('Admin copy email error:', err);
          result.adminEmail.error = toErrorMessage(err);
        }
      }
    } catch (err) {
      console.error('Resend email error:', err);
      result.email.error = toErrorMessage(err);
    }
    }
  } else {
    console.log('No valid email found, email not sent.');
    result.email.error = 'No applicant email found on application';
  }

  // Send real SMS via Twilio if configured
  if (tel) {
    result.sms.attempted = true;
    let smsMsg = `Viewing: ${ukDate} at ${details.time}.`;
    if (addressString) smsMsg += ` ${addressString}.`;
    if (details.note) smsMsg += ` Note: ${details.note}.`;
    if (landlordPhone) {
      smsMsg += ` Call landlord: ${landlordPhone}`;
    } else {
      smsMsg += ` Landlord contact unavailable.`;
    }
    smsMsg += ' - Rentsimple';
    if (twilioClient && twilioFrom) {
      try {
        // Format recipient as E.164 for UK: +447xxxxxxxxx
        let formattedTo = tel.trim();
        if (formattedTo.startsWith('07')) {
          formattedTo = '+44' + formattedTo.slice(1);
        } else if (formattedTo.startsWith('44')) {
          formattedTo = '+' + formattedTo;
        } else if (!formattedTo.startsWith('+')) {
          // fallback: just add +
          formattedTo = '+' + formattedTo;
        }
        await twilioClient.messages.create({
          body: smsMsg,
          from: twilioFrom,
          to: formattedTo
        });
        console.log(`SMS SENT via Twilio to ${formattedTo}`);
        result.sms.sent = true;
        result.sms.to = formattedTo;
      } catch (err) {
        console.error('Twilio SMS error:', err);
        result.sms.error = toErrorMessage(err);
      }
    } else {
      console.log(`(Simulated) SMS: To ${tel}`);
      console.log(`Message: ${smsMsg}`);
      result.sms.sent = true;
      result.sms.to = tel;
    }
  } else {
    console.log('No applicantTel/phone found, SMS not sent.');
    result.sms.error = 'No applicant phone found on application';
  }

  return result;
}
