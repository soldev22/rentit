/**
 * Notification service for RentIT
 * Handles sending notifications via email, SMS, and WhatsApp
 */

import twilio from 'twilio';

export type ContactMethod = 'email' | 'sms' | 'whatsapp';

export interface NotificationData {
  to: string; // email, phone number, or whatsapp number
  subject?: string; // for email
  message: string;
  method: ContactMethod;
}

export interface UserContactPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private twilioClient: twilio.Twilio | null = null;

  private constructor() {
    // Initialize Twilio client if credentials are available
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Send notification via specified method
   */
  async sendNotification(notification: NotificationData): Promise<boolean> {
    try {
      switch (notification.method) {
        case 'email':
          return await this.sendEmail(notification);
        case 'sms':
          return await this.sendSMS(notification);
        // COMMENTED OUT: WhatsApp notifications disabled except for permissions page
        /*
        case 'whatsapp':
          return await this.sendWhatsApp(notification);
        */
        default:
          console.error('Unknown notification method:', notification.method);
          return false;
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  /**
   * Send notification to user based on their contact preferences
   */
  async sendToUser(
    userEmail: string,
    userPhone: string | undefined,
    contactPreferences: UserContactPreferences,
    subject: string,
    message: string
  ): Promise<{ email: boolean; sms: boolean; whatsapp: boolean }> {
    const results = {
      email: false,
      sms: false,
      whatsapp: false,
    };

    // Send email if preferred
    if (contactPreferences.email) {
      results.email = await this.sendNotification({
        to: userEmail,
        subject,
        message,
        method: 'email',
      });
    }

    // Send SMS if preferred and phone available
    if (contactPreferences.sms && userPhone) {
      results.sms = await this.sendNotification({
        to: userPhone,
        message,
        method: 'sms',
      });
    }

    // Send WhatsApp if preferred and phone available
    // COMMENTED OUT: WhatsApp notifications disabled except for permissions page
    /*
    if (contactPreferences.whatsapp && userPhone) {
      results.whatsapp = await this.sendNotification({
        to: userPhone,
        message,
        method: 'whatsapp',
      });
    }
    */

    return results;
  }

  private async sendEmail(notification: NotificationData): Promise<boolean> {
    // TODO: Implement actual email sending
    // For now, just log the notification
    console.log('📧 EMAIL NOTIFICATION:', {
      to: notification.to,
      subject: notification.subject,
      message: notification.message,
    });

    // Simulate successful sending
    return true;
  }

  private async sendSMS(notification: NotificationData): Promise<boolean> {
    if (!this.twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
      console.log('📱 SMS NOTIFICATION (SIMULATED - Twilio not configured):', {
        to: notification.to,
        message: notification.message,
      });
      return true; // Simulate success for development
    }

    try {
      await this.twilioClient.messages.create({
        body: notification.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: notification.to
      });
      console.log('📱 SMS sent successfully to:', notification.to);
      return true;
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      return false;
    }
  }

  private async sendWhatsApp(notification: NotificationData): Promise<boolean> {
    if (!this.twilioClient || !process.env.TWILIO_WHATSAPP_NUMBER) {
      console.log('💬 WHATSAPP NOTIFICATION (SIMULATED - Twilio not configured):', {
        to: notification.to,
        message: notification.message,
      });
      return true; // Simulate success for development
    }

    try {
      await this.twilioClient.messages.create({
        body: notification.message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${notification.to}`
      });
      console.log('💬 WhatsApp message sent successfully to:', notification.to);
      return true;
    } catch (error) {
      console.error('❌ WhatsApp sending failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();