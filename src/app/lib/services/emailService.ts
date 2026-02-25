import { Resend } from 'resend';

// Lazy initialization of Resend client
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@sayso.app';
const FROM_NAME = process.env.FROM_NAME || 'SaySo';

interface ClaimReceivedEmailData {
  recipientEmail: string;
  recipientName?: string;
  businessName: string;
  businessCategory: string;
  businessLocation: string;
}

interface ClaimApprovedEmailData {
  recipientEmail: string;
  recipientName?: string;
  businessName: string;
  businessCategory: string;
  businessLocation: string;
  dashboardUrl: string;
}

interface OtpSentEmailData {
  recipientEmail: string;
  recipientName?: string;
  businessName: string;
  maskedPhone: string;
}

interface OtpVerifiedEmailData {
  recipientEmail: string;
  recipientName?: string;
  businessName: string;
}

interface DocsRequestedEmailData {
  recipientEmail: string;
  recipientName?: string;
  businessName: string;
  claimBusinessUrl: string;
}

interface DocsReceivedEmailData {
  recipientEmail: string;
  recipientName?: string;
  businessName: string;
}

interface ClaimStatusChangedEmailData {
  recipientEmail: string;
  recipientName?: string;
  businessName: string;
  status: string;
  message: string;
  dashboardUrl?: string;
}

export class EmailService {
  /**
   * Send "We received your claim" email
   */
  static async sendClaimReceivedEmail(data: ClaimReceivedEmailData): Promise<{ success: boolean; error?: string }> {
    try {
      const resend = getResendClient();
      if (!resend) {
        console.warn('RESEND_API_KEY not configured, skipping email');
        return { success: true }; // Don't fail if email is not configured
      }

      const { recipientEmail, recipientName, businessName, businessCategory, businessLocation } = data;

      const { error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: recipientEmail,
        subject: `We received your business claim request`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Claim Request Received</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #7D9B76 0%, #6B8A64 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Claim Request Received</h1>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="margin-top: 0;">${recipientName ? `Hi ${recipientName},` : 'Hi there,'}</p>
                
                <p>Thank you for submitting a claim request for <strong>${businessName}</strong>.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7D9B76;">
                  <p style="margin: 0 0 10px 0;"><strong>Business Details:</strong></p>
                  <p style="margin: 5px 0;"><strong>Name:</strong> ${businessName}</p>
                  <p style="margin: 5px 0;"><strong>Category:</strong> ${businessCategory}</p>
                  <p style="margin: 5px 0;"><strong>Location:</strong> ${businessLocation}</p>
                </div>
                
                <p>We've received your request and our team will review it shortly. You'll receive an email notification once your claim has been reviewed.</p>
                
                <p>If you have any questions or need to provide additional information, please don't hesitate to contact our support team.</p>
                
                <p style="margin-top: 30px;">Best regards,<br>The SaySo Team</p>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error('Error sending claim received email:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in sendClaimReceivedEmail:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send "Your claim is approved" email
   */
  static async sendClaimApprovedEmail(data: ClaimApprovedEmailData): Promise<{ success: boolean; error?: string }> {
    try {
      const resend = getResendClient();
      if (!resend) {
        console.warn('RESEND_API_KEY not configured, skipping email');
        return { success: true }; // Don't fail if email is not configured
      }

      const { recipientEmail, recipientName, businessName, businessCategory, businessLocation, dashboardUrl } = data;

      const { error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: recipientEmail,
        subject: `Your business claim has been approved!`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Claim Approved</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #7D9B76 0%, #6B8A64 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Claim Approved!</h1>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="margin-top: 0;">${recipientName ? `Hi ${recipientName},` : 'Hi there,'}</p>
                
                <p>Great news! Your claim request for <strong>${businessName}</strong> has been approved.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7D9B76;">
                  <p style="margin: 0 0 10px 0;"><strong>Business Details:</strong></p>
                  <p style="margin: 5px 0;"><strong>Name:</strong> ${businessName}</p>
                  <p style="margin: 5px 0;"><strong>Category:</strong> ${businessCategory}</p>
                  <p style="margin: 5px 0;"><strong>Location:</strong> ${businessLocation}</p>
                </div>
                
                <p>You now have full access to manage your business profile. You can:</p>
                <ul style="margin: 20px 0; padding-left: 20px;">
                  <li>Respond to customer reviews</li>
                  <li>Update business information</li>
                  <li>View analytics and insights</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #7D9B76 0%, #6B8A64 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
                </div>
                
                <p style="margin-top: 30px;">If you have any questions or need assistance, our support team is here to help.</p>
                
                <p>Best regards,<br>The SaySo Team</p>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error('Error sending claim approved email:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in sendClaimApprovedEmail:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async sendOtpSentEmail(data: OtpSentEmailData): Promise<{ success: boolean; error?: string }> {
    const resend = getResendClient();
    if (!resend) return { success: true };
    const { recipientEmail, recipientName, businessName, maskedPhone } = data;
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject: `Verification code for ${businessName}`,
      html: minimalClaimHtml(
        'Verification code sent',
        recipientName,
        `We sent a verification code to ${maskedPhone} for your claim on <strong>${businessName}</strong>. Enter it in the app to continue. The code expires in 10 minutes.`
      ),
    });
    if (error) {
      console.error('OtpSent email failed:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  static async sendOtpVerifiedEmail(data: OtpVerifiedEmailData): Promise<{ success: boolean; error?: string }> {
    const resend = getResendClient();
    if (!resend) return { success: true };
    const { recipientEmail, recipientName, businessName } = data;
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject: `Phone verified for ${businessName}`,
      html: minimalClaimHtml(
        'Phone verification successful',
        recipientName,
        `Your phone has been verified for <strong>${businessName}</strong>. We'll review your claim and get back to you shortly.`
      ),
    });
    if (error) {
      console.error('OtpVerified email failed:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  static async sendDocsRequestedEmail(data: DocsRequestedEmailData): Promise<{ success: boolean; error?: string }> {
    const resend = getResendClient();
    if (!resend) return { success: true };
    const { recipientEmail, recipientName, businessName, claimBusinessUrl } = data;
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject: `Documents required for ${businessName}`,
      html: minimalClaimHtml(
        'Documents required',
        recipientName,
        `We need additional documents to verify your claim for <strong>${businessName}</strong>. Please upload a letterhead authorization and/or lease first page (PDF, JPG or PNG, max 5MB) in your claim page.`,
        claimBusinessUrl
      ),
    });
    if (error) {
      console.error('DocsRequested email failed:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  static async sendDocsReceivedEmail(data: DocsReceivedEmailData): Promise<{ success: boolean; error?: string }> {
    const resend = getResendClient();
    if (!resend) return { success: true };
    const { recipientEmail, recipientName, businessName } = data;
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject: `Documents received for ${businessName}`,
      html: minimalClaimHtml(
        'Documents received',
        recipientName,
        `We've received your documents for <strong>${businessName}</strong>. Our team will review them and notify you once the claim is processed.`
      ),
    });
    if (error) {
      console.error('DocsReceived email failed:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  static async sendClaimStatusChangedEmail(data: ClaimStatusChangedEmailData): Promise<{ success: boolean; error?: string }> {
    const resend = getResendClient();
    if (!resend) return { success: true };
    const { recipientEmail, recipientName, businessName, status, message, dashboardUrl } = data;
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject: `Claim update: ${businessName} – ${status}`,
      html: minimalClaimHtml(
        `Claim ${status}`,
        recipientName,
        message,
        dashboardUrl
      ),
    });
    if (error) {
      console.error('ClaimStatusChanged email failed:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }
}

function minimalClaimHtml(title: string, recipientName: string | undefined, body: string, ctaUrl?: string): string {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,';
  const cta = ctaUrl
    ? `<p style="margin-top: 20px;"><a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #7D9B76 0%, #6B8A64 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: 600;">View claim</a></p>`
    : '';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #7D9B76 0%, #6B8A64 100%); padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">${title}</h1>
  </div>
  <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="margin-top: 0;">${greeting}</p>
    <p>${body}</p>
    ${cta}
    <p style="margin-top: 24px;">Best regards,<br>The SaySo Team</p>
  </div>
  <div style="text-align: center; margin-top: 16px; color: #999; font-size: 12px;"><p>This is an automated message.</p></div>
</body>
</html>`;
}

