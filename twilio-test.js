

// Minimal Twilio SMS test script
// Usage: node twilio-test.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import twilio from 'twilio';


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_PHONE_NUMBER;
const to = process.env.TWILIO_TEST_TO || from; // Set TWILIO_TEST_TO in .env.local or use your own number


const client = twilio(accountSid, authToken);

async function sendTestSMS() {
  try {
    console.log('Twilio test: from =', from, ', to =', to);
    if (!to) {
      throw new Error("Missing 'to' number. Check TWILIO_TEST_TO in .env.local");
    }
    if (!from) {
      throw new Error("Missing 'from' number. Check TWILIO_PHONE_NUMBER in .env.local");
    }
    const message = await client.messages.create({
      body: 'Twilio test: If you receive this, credentials are correct.',
      from,
      to
    });
    console.log('SMS sent! SID:', message.sid);
  } catch (err) {
    console.error('Twilio error:', err);
  }
}

sendTestSMS();
