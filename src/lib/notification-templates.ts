/**
 * Notification templates and utilities for Rentsimple
 */

export interface NotificationTemplate {
  subject: string;
  message: string;
}

export class NotificationTemplates {
  static applicationSubmitted(propertyTitle: string): NotificationTemplate {
    return {
      subject: 'Viewing Request Sent',
      message: `Your viewing request for ${propertyTitle} has been sent successfully. We'll keep you updated.`
    };
  }

  static viewingRequestSentEmail(propertyLabel: string): NotificationTemplate {
    return {
      subject: 'Viewing Request Sent',
      message: `Your viewing request for ${propertyLabel} has been sent successfully. We'll keep you updated.`
    };
  }

  static viewingRequestSentSms(): NotificationTemplate {
    return {
      subject: 'Viewing Request Sent',
      message: `Your viewing request has been sent successfully. We'll keep you updated.`
    };
  }

  static viewingApproved(propertyTitle: string): NotificationTemplate {
    return {
      subject: 'Viewing Request Approved',
      message: `Great news! Your viewing request for ${propertyTitle} has been approved. Please check your email for viewing arrangements.`
    };
  }

  static viewingDeclined(propertyTitle: string): NotificationTemplate {
    return {
      subject: 'Viewing Request Update',
      message: `We can't proceed with your viewing request for ${propertyTitle} at this time. Please contact the landlord for more information.`
    };
  }

  static backgroundChecksApproved(propertyTitle: string): NotificationTemplate {
    return {
      subject: 'Application Moving Forward',
      message: `Your application for ${propertyTitle} is progressing. Background checks have been approved.`
    };
  }

  static backgroundChecksDeclined(propertyTitle: string): NotificationTemplate {
    return {
      subject: 'Application Update',
      message: `We can't proceed with your application for ${propertyTitle} at this time. Please contact the landlord for more information.`
    };
  }

  static creditCheckCompleted(propertyTitle: string, score: number): NotificationTemplate {
    const result = score >= 70 ? 'successful' : 'unsuccessful';
    return {
      subject: 'Credit Check Completed',
      message: `Credit check completed for ${propertyTitle}. Result: ${result} (Score: ${score}/100)`
    };
  }

  static documentsSent(propertyTitle: string): NotificationTemplate {
    return {
      subject: 'Documents Sent',
      message: `Your tenancy documents for ${propertyTitle} have been sent. Please check your email and review the documents.`
    };
  }

  static documentsSigned(propertyTitle: string): NotificationTemplate {
    return {
      subject: 'Documents Signed Successfully',
      message: `Documents signed successfully for ${propertyTitle}. Your tenancy application is almost complete!`
    };
  }

  static tenancyConfirmed(propertyTitle: string, moveInDate?: string): NotificationTemplate {
    return {
      subject: 'Tenancy Confirmed!',
      message: `Congratulations! Your tenancy for ${propertyTitle} has been confirmed. Move-in date: ${moveInDate || 'TBD'}`
    };
  }

  static tenancyCompleted(propertyTitle: string): NotificationTemplate {
    return {
      subject: 'Tenancy Complete',
      message: `Your tenancy for ${propertyTitle} is now complete. Welcome to your new home!`
    };
  }

  static maintenanceRequestCreated(propertyTitle: string, issue: string): NotificationTemplate {
    return {
      subject: 'Maintenance Request Submitted',
      message: `Your maintenance request for ${propertyTitle} has been submitted: "${issue}". We'll update you on the progress.`
    };
  }

  static maintenanceRequestUpdated(propertyTitle: string, status: string): NotificationTemplate {
    return {
      subject: 'Maintenance Request Update',
      message: `Your maintenance request for ${propertyTitle} has been updated. Status: ${status}.`
    };
  }

  static applicantConfirmedPropertyLandlordEmail(
    applicantName: string,
    propertyLabel: string,
    manageLink: string
  ): NotificationTemplate {
    const name = applicantName?.trim() || 'An applicant';
    return {
      subject: 'Viewing update: applicant confirmed',
      message:
        `${name} confirmed they’re happy to proceed with ${propertyLabel}.\n\n` +
        `View the application: ${manageLink}\n\n` +
        `RentIT`,
    };
  }

  static applicantDeclinedPropertyLandlordEmail(
    applicantName: string,
    propertyLabel: string,
    manageLink: string
  ): NotificationTemplate {
    const name = applicantName?.trim() || 'An applicant';
    return {
      subject: 'Viewing update: applicant declined',
      message:
        `${name} declined to proceed with ${propertyLabel}.\n\n` +
        `View the application: ${manageLink}\n\n` +
        `RentIT`,
    };
  }

  /**
   * Privacy-safe SMS for landlord (no address details).
   */
  static applicantDecisionLandlordSms(decision: 'confirmed' | 'declined', manageLink: string): NotificationTemplate {
    const decisionText = decision === 'confirmed' ? 'confirmed' : 'declined';
    return {
      subject: 'Viewing update',
      message: `Viewing update: applicant ${decisionText}. Open: ${manageLink} - RentIT`,
    };
  }
}