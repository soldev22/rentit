/**
 * Test script for Rentsimple notification system
 * Run with: npx tsx scripts/test-notifications.ts
 */

import { notificationService } from '../src/lib/notification';
import { NotificationTemplates } from '../src/lib/notification-templates';

async function testNotifications() {
  console.log('🔔 Testing Rentsimple Notification System\n');

  // Test data
  const testUser = {
    email: 'test@example.com',
    phone: '+1234567890',
    contactPreferences: {
      email: true,
      sms: true,
      whatsapp: true,
    }
  };

  const propertyTitle = 'Beautiful 2-Bed Apartment';

  console.log('📧 Testing Email Notification...');
  const emailResult = await notificationService.sendNotification({
    to: testUser.email,
    subject: 'Test Email',
    message: 'This is a test email notification',
    method: 'email'
  });
  console.log('Email result:', emailResult ? '✅ Sent' : '❌ Failed');

  console.log('\n📱 Testing SMS Notification...');
  const smsResult = await notificationService.sendNotification({
    to: testUser.phone,
    message: 'This is a test SMS notification',
    method: 'sms'
  });
  console.log('SMS result:', smsResult ? '✅ Sent' : '❌ Failed');

  // COMMENTED OUT: WhatsApp notifications disabled except for permissions page
  /*
  console.log('\n💬 Testing WhatsApp Notification...');
  const whatsappResult = await notificationService.sendNotification({
    to: testUser.phone,
    message: 'This is a test WhatsApp notification',
    method: 'whatsapp'
  });
  console.log('WhatsApp result:', whatsappResult ? '✅ Sent' : '❌ Failed');
  */

  console.log('\n📨 Testing Multi-Channel Notification...');
  const template = NotificationTemplates.applicationSubmitted(propertyTitle);
  const multiResult = await notificationService.sendToUser(
    testUser.email,
    testUser.phone,
    testUser.contactPreferences,
    template.subject,
    template.message
  );
  console.log('Multi-channel results:', {
    email: multiResult.email,
    sms: multiResult.sms,
    // COMMENTED OUT: WhatsApp notifications disabled except for permissions page
    // whatsapp: multiResult.whatsapp
  });

  console.log('\n🎯 Testing All Notification Templates...');
  const templates = [
    NotificationTemplates.viewingApproved(propertyTitle),
    NotificationTemplates.creditCheckCompleted(propertyTitle, 85),
    NotificationTemplates.tenancyConfirmed(propertyTitle, '2025-01-15'),
    NotificationTemplates.tenancyCompleted(propertyTitle),
  ];

  for (const template of templates) {
    console.log(`\n📧 ${template.subject}`);
    console.log(`   ${template.message}`);
  }

  console.log('\n✅ Notification system test completed!');
}

// Run the test
testNotifications().catch(console.error);