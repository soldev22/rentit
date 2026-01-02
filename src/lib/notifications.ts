import twilio from 'twilio';
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
const twilioClient = (twilioSid && twilioToken) ? twilio(twilioSid, twilioToken) : null;

import resend from './resend';
// Notification sender for viewing scheduling

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
  phone?: string;
  tel?: string;
  profile?: {
    phone?: string;
    [key: string]: any;
  };
  // Add other landlord fields as needed
}

export async function sendViewingNotification(
  application: ViewingApplication,
  details: { date: string; time: string; property?: Property; landlord?: Landlord }
) {
  // Try to get the best email and phone fields
  const email = application.applicantEmail || application.email || application.userEmail || application.applicant?.email || application.applicantName || 'UNKNOWN';
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
  if (email && email !== 'UNKNOWN') {
    try {
      let landlordContactLine = '';
      if (landlordPhone) {
        landlordContactLine = `<br><br>If you need to contact the landlord, please call: <b>${landlordPhone}</b>`;
      } else {
        landlordContactLine = `<br><br><b>Landlord contact number not available.</b>`;
      }
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'NoReply@solutionsdeveloped.co.uk',
        to: email,
        subject: 'Viewing Scheduled',
        html: `<p>Hi,<br><br>Your property viewing is scheduled for <b>${ukDate}</b> at <b>${details.time}</b>.<br>Property: <b>${addressString}</b><br><br>We're looking forward to meeting you!<br><br><b>Please do not reply to this email.</b>${landlordContactLine}<br><br>If you have any questions or need to reschedule, please call the landlord directly.<br><br>Best regards,<br>The Rentsimple Team</p>`
      });
      console.log(`EMAIL SENT via Resend to ${email}`);
    } catch (err) {
      console.error('Resend email error:', err);
    }
  } else {
    console.log('No valid email found, email not sent.');
  }

  // Send real SMS via Twilio if configured
  if (tel) {
    let smsMsg = `Viewing: ${ukDate} at ${details.time}.`;
    if (addressString) smsMsg += ` ${addressString}.`;
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
      } catch (err) {
        console.error('Twilio SMS error:', err);
      }
    } else {
      console.log(`(Simulated) SMS: To ${tel}`);
      console.log(`Message: ${smsMsg}`);
    }
  } else {
    console.log('No applicantTel/phone found, SMS not sent.');
  }

  // Simulate async
  return Promise.resolve();
}
