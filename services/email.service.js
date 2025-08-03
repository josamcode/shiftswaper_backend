// services/email.service.js
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Professional email template generator
  generateEmailTemplate(title, content, buttonText = null, buttonUrl = null, type = 'info') {
    const colors = {
      info: { primary: '#2563eb', secondary: '#dbeafe' },
      success: { primary: '#059669', secondary: '#d1fae5' },
      warning: { primary: '#d97706', secondary: '#fef3c7' },
      error: { primary: '#dc2626', secondary: '#fee2e2' }
    };

    const color = colors[type] || colors.info;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;line-height:1.6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
              
              <!-- Header -->
              <tr>
                <td style="padding:32px 40px 24px;border-bottom:1px solid #e5e7eb;">
                  <h1 style="margin:0;font-size:28px;font-weight:600;color:#111827;">ShiftSwaper</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding:32px 40px;">
                  <div style="background:${color.secondary};padding:16px;border-radius:6px;border-left:4px solid ${color.primary};margin-bottom:24px;">
                    <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">${title}</h2>
                  </div>
                  ${content}
                  ${buttonText && buttonUrl ? `
                  <div style="text-align:center;margin:32px 0;">
                    <a href="${buttonUrl}" style="display:inline-block;padding:12px 24px;background:${color.primary};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:500;font-size:16px;">${buttonText}</a>
                  </div>
                  ` : ''}
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:14px;color:#6b7280;text-align:center;">
                    © ${new Date().getFullYear()} ShiftSwaper. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
  }

  // Shift swap notifications
  async sendShiftSwapNotification(notificationType, recipient, requestData) {
    const requesterName = requestData.requesterUserId?.fullName || 'Unknown Requester';
    const shiftStartDate = requestData.shiftStartDate ? new Date(requestData.shiftStartDate).toLocaleString() : 'Unknown Date';
    const shiftEndDate = requestData.shiftEndDate ? new Date(requestData.shiftEndDate).toLocaleString() : 'Unknown Date';
    const requestReason = requestData.reason || 'No reason provided';
    const requestId = requestData._id || 'Unknown ID';

    let subject, content, buttonText, type;

    switch (notificationType) {
      case 'new_offer':
        subject = 'New Offer for Your Shift Swap Request';
        type = 'info';
        content = `
          <p style="margin:0 0 16px;color:#374151;">Hello ${requesterName},</p>
          <p style="margin:0 0 24px;color:#374151;">A new Offer has been made for your shift swap request.</p>
          
          <div style="background:#f9fafb;padding:20px;border-radius:6px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#111827;font-size:16px;">Request Details</h3>
            <p style="margin:4px 0;color:#6b7280;"><strong>Request ID:</strong> ${requestId}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Shift:</strong> ${shiftStartDate} - ${shiftEndDate}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Reason:</strong> ${requestReason}</p>
          </div>
          
          <p style="margin:0;color:#374151;">Please review the offer and decide whether to accept it.</p>
        `;
        buttonText = 'Review Offer';
        break;

      case 'offer_accepted':
        const offerMakerName = requestData.offerMaker?.fullName || 'Unknown Employee';
        subject = 'Your Offer Has Been Accepted';
        type = 'success';
        content = `
          <p style="margin:0 0 16px;color:#374151;">Hello ${offerMakerName},</p>
          <p style="margin:0 0 24px;color:#374151;">Great news! Your Offer has been accepted.</p>
          
          <div style="background:#f9fafb;padding:20px;border-radius:6px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#111827;font-size:16px;">Accepted Offer</h3>
            <p style="margin:4px 0;color:#6b7280;"><strong>Request ID:</strong> ${requestId}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Requester:</strong> ${requesterName}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Shift:</strong> ${shiftStartDate} - ${shiftEndDate}</p>
          </div>
          
          <p style="margin:0;color:#374151;">The request is now pending supervisor approval.</p>
        `;
        buttonText = 'View Details';
        break;

      case 'request_approved':
        subject = 'Shift Swap Request Approved';
        type = 'success';
        content = `
          <p style="margin:0 0 16px;color:#374151;">Hello,</p>
          <p style="margin:0 0 24px;color:#374151;">Your shift swap request has been approved.</p>
          
          <div style="background:#f9fafb;padding:20px;border-radius:6px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#111827;font-size:16px;">Approved Request</h3>
            <p style="margin:4px 0;color:#6b7280;"><strong>Request ID:</strong> ${requestId}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Requester:</strong> ${requesterName}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Shift:</strong> ${shiftStartDate} - ${shiftEndDate}</p>
          </div>
          
          <p style="margin:0;color:#374151;">The shift swap is now confirmed and active.</p>
        `;
        buttonText = 'View Schedule';
        break;

      case 'request_rejected':
        const rejectionReason = requestData.comment || 'No reason provided';
        subject = 'Shift Swap Request Rejected';
        type = 'error';
        content = `
          <p style="margin:0 0 16px;color:#374151;">Hello,</p>
          <p style="margin:0 0 24px;color:#374151;">Your shift swap request has been rejected.</p>
          
          <div style="background:#f9fafb;padding:20px;border-radius:6px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#111827;font-size:16px;">Rejected Request</h3>
            <p style="margin:4px 0;color:#6b7280;"><strong>Request ID:</strong> ${requestId}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Shift:</strong> ${shiftStartDate} - ${shiftEndDate}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Rejection Reason:</strong> ${rejectionReason}</p>
          </div>
          
          <p style="margin:0;color:#374151;">Please contact your supervisor for more information.</p>
        `;
        buttonText = 'Contact Support';
        break;

      case 'supervisor_notification':
        const action = requestData.action || 'updated';
        subject = `Shift Swap Request ${action.charAt(0).toUpperCase() + action.slice(1)}`;
        type = 'warning';
        content = `
          <p style="margin:0 0 16px;color:#374151;">Hello,</p>
          <p style="margin:0 0 24px;color:#374151;">A shift swap request requires your attention.</p>
          
          <div style="background:#f9fafb;padding:20px;border-radius:6px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#111827;font-size:16px;">Request Details</h3>
            <p style="margin:4px 0;color:#6b7280;"><strong>Request ID:</strong> ${requestId}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Requester:</strong> ${requesterName}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Shift:</strong> ${shiftStartDate} - ${shiftEndDate}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Status:</strong> ${action.charAt(0).toUpperCase() + action.slice(1)}</p>
          </div>
          
          <p style="margin:0;color:#374151;">Please review and take necessary action.</p>
        `;
        buttonText = 'Review Request';
        break;

      default:
        return { success: false, error: 'Unknown notification type' };
    }

    const html = this.generateEmailTemplate(
      subject,
      content,
      buttonText,
      process.env.FRONTEND_URL || '#',
      type
    );

    const mailOptions = {
      from: `"ShiftSwaper" <${process.env.EMAIL_USER}>`,
      to: recipient.email,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${recipient.email}`);
      return { success: true };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Day off swap notifications
  async sendDayOffSwapNotification(notificationType, recipient, requestData) {
    const requesterName = requestData.requesterUserId?.fullName || 'Unknown Requester';
    const originalDayOff = requestData.originalDayOff ? new Date(requestData.originalDayOff).toLocaleDateString() : 'Unknown Date';
    const requestedDayOff = requestData.requestedDayOff ? new Date(requestData.requestedDayOff).toLocaleDateString() : 'Unknown Date';
    const reason = requestData.reason || 'No reason provided';
    const requestId = requestData._id || 'Unknown ID';

    let subject, content, buttonText, type;

    switch (notificationType) {
      case 'new_match':
        subject = 'New Offer for Your Day Off Swap Request';
        type = 'info';
        content = `
          <p style="margin:0 0 16px;color:#374151;">Hello ${requesterName},</p>
          <p style="margin:0 0 24px;color:#374151;">A new offer has been made for your day off swap request.</p>
          
          <div style="background:#f9fafb;padding:20px;border-radius:6px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#111827;font-size:16px;">Request Details</h3>
            <p style="margin:4px 0;color:#6b7280;"><strong>Request ID:</strong> ${requestId}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Your Day Off:</strong> ${originalDayOff}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Requested Day:</strong> ${requestedDayOff}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Reason:</strong> ${reason}</p>
          </div>
          
          <p style="margin:0;color:#374151;">Please review the offer and decide whether to accept it.</p>
        `;
        buttonText = 'Review Offer';
        break;

      case 'match_accepted':
        const matchMakerName = requestData.matchMaker?.fullName || 'Unknown Employee';
        subject = 'Your Day Off Offer Has Been Accepted';
        type = 'success';
        content = `
          <p style="margin:0 0 16px;color:#374151;">Hello ${matchMakerName},</p>
          <p style="margin:0 0 24px;color:#374151;">Great news! Your day off swap offer has been accepted.</p>
          
          <div style="background:#f9fafb;padding:20px;border-radius:6px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#111827;font-size:16px;">Accepted Offer</h3>
            <p style="margin:4px 0;color:#6b7280;"><strong>Request ID:</strong> ${requestId}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Requester:</strong> ${requesterName}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Day Off Swap:</strong> ${originalDayOff} ↔ ${requestedDayOff}</p>
          </div>
          
          <p style="margin:0;color:#374151;">The request is now pending supervisor approval.</p>
        `;
        buttonText = 'View Details';
        break;

      case 'request_approved':
        subject = 'Day Off Swap Request Approved';
        type = 'success';
        content = `
          <p style="margin:0 0 16px;color:#374151;">Hello,</p>
          <p style="margin:0 0 24px;color:#374151;">Your day off swap request has been approved.</p>
          
          <div style="background:#f9fafb;padding:20px;border-radius:6px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#111827;font-size:16px;">Approved Request</h3>
            <p style="margin:4px 0;color:#6b7280;"><strong>Request ID:</strong> ${requestId}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Day Off Swap:</strong> ${originalDayOff} ↔ ${requestedDayOff}</p>
          </div>
          
          <p style="margin:0;color:#374151;">The day off swap is now confirmed and active.</p>
        `;
        buttonText = 'View Schedule';
        break;

      case 'request_rejected':
        const rejectionReason = requestData.comment || 'No reason provided';
        subject = 'Day Off Swap Request Rejected';
        type = 'error';
        content = `
          <p style="margin:0 0 16px;color:#374151;">Hello,</p>
          <p style="margin:0 0 24px;color:#374151;">Your day off swap request has been rejected.</p>
          
          <div style="background:#f9fafb;padding:20px;border-radius:6px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#111827;font-size:16px;">Rejected Request</h3>
            <p style="margin:4px 0;color:#6b7280;"><strong>Request ID:</strong> ${requestId}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Day Off Swap:</strong> ${originalDayOff} ↔ ${requestedDayOff}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Rejection Reason:</strong> ${rejectionReason}</p>
          </div>
          
          <p style="margin:0;color:#374151;">Please contact your supervisor for more information.</p>
        `;
        buttonText = 'Contact Support';
        break;

      case 'supervisor_notification':
        const action = requestData.action || 'updated';
        subject = `Day Off Swap Request ${action.charAt(0).toUpperCase() + action.slice(1)}`;
        type = 'warning';
        content = `
          <p style="margin:0 0 16px;color:#374151;">Hello,</p>
          <p style="margin:0 0 24px;color:#374151;">A day off swap request requires your attention.</p>
          
          <div style="background:#f9fafb;padding:20px;border-radius:6px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#111827;font-size:16px;">Request Details</h3>
            <p style="margin:4px 0;color:#6b7280;"><strong>Request ID:</strong> ${requestId}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Requester:</strong> ${requesterName}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Day Off Swap:</strong> ${originalDayOff} ↔ ${requestedDayOff}</p>
            <p style="margin:4px 0;color:#6b7280;"><strong>Status:</strong> ${action.charAt(0).toUpperCase() + action.slice(1)}</p>
          </div>
          
          <p style="margin:0;color:#374151;">Please review and take necessary action.</p>
        `;
        buttonText = 'Review Request';
        break;

      default:
        return { success: false, error: 'Unknown notification type' };
    }

    const html = this.generateEmailTemplate(
      subject,
      content,
      buttonText,
      process.env.FRONTEND_URL || '#',
      type
    );

    const mailOptions = {
      from: `"ShiftSwaper" <${process.env.EMAIL_USER}>`,
      to: recipient.email,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${recipient.email}`);
      return { success: true };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // OTP Email
  async sendOTP(email, otp) {
    const subject = 'Your Verification Code';
    const content = `
      <p style="margin:0 0 16px;color:#374151;">Hello,</p>
      <p style="margin:0 0 24px;color:#374151;">Please use the verification code below to complete your registration:</p>
      
      <div style="text-align:center;margin:32px 0;">
        <div style="display:inline-block;padding:16px 24px;font-size:32px;font-weight:700;letter-spacing:8px;background:#f8fafc;border:2px solid #e5e7eb;border-radius:8px;color:#111827;">
          ${otp}
        </div>
      </div>
      
      <p style="margin:0 0 16px;color:#374151;">This code will expire in 10 minutes.</p>
      <p style="margin:0;color:#6b7280;font-size:14px;">If you didn't request this code, please ignore this email.</p>
    `;

    const html = this.generateEmailTemplate(subject, content, null, null, 'info');

    const mailOptions = {
      from: `"ShiftSwaper" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`OTP sent successfully to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();