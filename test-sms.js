/**
 * Test script to send SMS directly using Twilio
 */

import twilio from 'twilio';
import { readFileSync } from 'fs';

// Load environment variables from .env.local manually
function loadEnv() {
  try {
    const envContent = readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    }
  } catch (error) {
    console.log('Could not load .env.local file:', error.message);
  }
}

loadEnv();

async function testSMS() {
  const phoneNumber = '07769870670';
  const message = 'Hello! This is a test SMS from Rentsimple platform. If you received this, SMS notifications are working correctly! 📱';

  console.log('🚀 Sending test SMS to:', phoneNumber);

  // Check if Twilio credentials are available
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log('❌ Twilio credentials not found in environment variables');
    console.log('Account SID:', !!accountSid);
    console.log('Auth Token:', !!authToken);
    console.log('From Number:', !!fromNumber);
    return;
  }

  try {
    const client = twilio(accountSid, authToken);

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: phoneNumber
    });

    console.log('✅ SMS sent successfully!');
    console.log('Message SID:', result.sid);
    console.log('Status:', result.status);

  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
  }
}

// Run the test
testSMS();