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

  // New method for sending shift swap notifications
  async sendShiftSwapNotification(notificationType, recipient, requestData) {
    let subject, html;

    const requesterName = requestData.requesterUserId?.fullName || 'Unknown Requester';
    const shiftStartDate = requestData.shiftStartDate ? new Date(requestData.shiftStartDate).toLocaleString() : 'Unknown Date';
    const shiftEndDate = requestData.shiftEndDate ? new Date(requestData.shiftEndDate).toLocaleString() : 'Unknown Date';
    const requestReason = requestData.reason || 'No reason provided';
    const requestId = requestData._id || 'Unknown ID';

    switch (notificationType) {
      case 'new_offer':
        subject = `New Counter Offer for Your Shift Swap Request`;
        html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #007bff, #0056d2); padding: 24px 32px;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">New Counter Offer Received</h1>
              </div>
              <div style="padding: 30px 32px;">
                <p style="font-size: 16px; color: #333333;">Hello ${requesterName},</p>
                <p style="font-size: 16px; color: #555;">
                  A new counter offer has been made for your shift swap request.
                </p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #007bff;">Request Details</h3>
                  <p><strong>Request ID:</strong> ${requestId}</p>
                  <p><strong>Your Original Shift:</strong> ${shiftStartDate} - ${shiftEndDate}</p>
                  <p><strong>Reason:</strong> ${requestReason}</p>
                </div>
                <p style="font-size: 16px; color: #555;">
                  Please log in to your account to review the offer and decide whether to accept it.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || '#'}" 
                     style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    View Request
                  </a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                <p style="font-size: 13px; color: #bbb; text-align: center;">
                  © ${new Date().getFullYear()} Shiftswaper. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'offer_accepted':
        const offerMakerName = requestData.offerMaker?.fullName || 'Unknown Employee';
        subject = `Your Counter Offer Has Been Accepted`;
        html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #28a745, #218838); padding: 24px 32px;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Offer Accepted!</h1>
              </div>
              <div style="padding: 30px 32px;">
                <p style="font-size: 16px; color: #333333;">Hello ${offerMakerName},</p>
                <p style="font-size: 16px; color: #555;">
                  Great news! Your counter offer for the shift swap request has been accepted.
                </p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #28a745;">Accepted Offer Details</h3>
                  <p><strong>Request ID:</strong> ${requestId}</p>
                  <p><strong>Requester:</strong> ${requesterName}</p>
                  <p><strong>Shift You Offered:</strong> ${shiftStartDate} - ${shiftEndDate}</p>
                </div>
                <p style="font-size: 16px; color: #555;">
                  The request is now pending approval from the supervisors. You will be notified once a decision is made.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                <p style="font-size: 13px; color: #bbb; text-align: center;">
                  © ${new Date().getFullYear()} Shiftswaper. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'request_approved':
        subject = `Shift Swap Request Approved`;
        html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #28a745, #218838); padding: 24px 32px;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Request Approved!</h1>
              </div>
              <div style="padding: 30px 32px;">
                <p style="font-size: 16px; color: #333333;">Hello,</p>
                <p style="font-size: 16px; color: #555;">
                  The shift swap request has been approved.
                </p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #28a745;">Approved Request Details</h3>
                  <p><strong>Request ID:</strong> ${requestId}</p>
                  <p><strong>Requester:</strong> ${requesterName}</p>
                  <p><strong>Shift:</strong> ${shiftStartDate} - ${shiftEndDate}</p>
                  <p><strong>Reason:</strong> ${requestReason}</p>
                </div>
                <p style="font-size: 16px; color: #555;">
                  The shift swap is now confirmed.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                <p style="font-size: 13px; color: #bbb; text-align: center;">
                  © ${new Date().getFullYear()} Shiftswaper. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'request_rejected':
        const rejectionReason = requestData.comment || 'No reason provided';
        subject = `Shift Swap Request Rejected`;
        html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #dc3545, #c82333); padding: 24px 32px;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Request Rejected</h1>
              </div>
              <div style="padding: 30px 32px;">
                <p style="font-size: 16px; color: #333333;">Hello,</p>
                <p style="font-size: 16px; color: #555;">
                  The shift swap request has been rejected.
                </p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #dc3545;">Rejected Request Details</h3>
                  <p><strong>Request ID:</strong> ${requestId}</p>
                  <p><strong>Requester:</strong> ${requesterName}</p>
                  <p><strong>Shift:</strong> ${shiftStartDate} - ${shiftEndDate}</p>
                  <p><strong>Reason:</strong> ${requestReason}</p>
                  <p><strong>Rejection Reason:</strong> ${rejectionReason}</p>
                </div>
                <p style="font-size: 16px; color: #555;">
                  Please contact your supervisor if you have any questions.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                <p style="font-size: 13px; color: #bbb; text-align: center;">
                  © ${new Date().getFullYear()} Shiftswaper. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'supervisor_notification':
        const action = requestData.action || 'updated'; // 'approved', 'rejected', 'offer_made', etc.
        subject = `Shift Swap Request ${action.charAt(0).toUpperCase() + action.slice(1)}`;
        html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #17a2b8, #138496); padding: 24px 32px;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Supervisor Notification</h1>
              </div>
              <div style="padding: 30px 32px;">
                <p style="font-size: 16px; color: #333333;">Hello,</p>
                <p style="font-size: 16px; color: #555;">
                  A shift swap request requiring your attention has been ${action}.
                </p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #17a2b8;">Request Details</h3>
                  <p><strong>Request ID:</strong> ${requestId}</p>
                  <p><strong>Requester:</strong> ${requesterName}</p>
                  <p><strong>Shift:</strong> ${shiftStartDate} - ${shiftEndDate}</p>
                  <p><strong>Reason:</strong> ${requestReason}</p>
                  ${action !== 'offer_made' ? `<p><strong>Action:</strong> ${action.charAt(0).toUpperCase() + action.slice(1)}</p>` : ''}
                  ${requestData.comment ? `<p><strong>Comment:</strong> ${requestData.comment}</p>` : ''}
                </div>
                <p style="font-size: 16px; color: #555;">
                  Please log in to review and take necessary action.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || '#'}" 
                     style="display: inline-block; padding: 12px 24px; background-color: #17a2b8; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    View Request
                  </a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                <p style="font-size: 13px; color: #bbb; text-align: center;">
                  © ${new Date().getFullYear()} Shiftswaper. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      default:
        console.warn(`Unknown notification type: ${notificationType}`);
        return { success: false, error: 'Unknown notification type' };
    }

    const mailOptions = {
      from: `"Shiftswaper" <${process.env.EMAIL_USER}>`,
      to: recipient.email,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${recipient.email} for notification type: ${notificationType}`);
      return { success: true };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // New method for sending day off swap notifications
  async sendDayOffSwapNotification(notificationType, recipient, requestData) {
    let subject, html;

    const requesterName = requestData.requesterUserId?.fullName || 'Unknown Requester';
    const originalDayOff = requestData.originalDayOff ? new Date(requestData.originalDayOff).toLocaleDateString() : 'Unknown Date';
    const requestedDayOff = requestData.requestedDayOff ? new Date(requestData.requestedDayOff).toLocaleDateString() : 'Unknown Date';
    const reason = requestData.reason || 'No reason provided';
    const requestId = requestData._id || 'Unknown ID';

    switch (notificationType) {
      case 'new_match':
        subject = `New Offer Proposal for Your Day Off Swap Request`;
        html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #007bff, #0056d2); padding: 24px 32px;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">New Offer Proposal Received</h1>
              </div>
              <div style="padding: 30px 32px;">
                <p style="font-size: 16px; color: #333333;">Hello ${requesterName},</p>
                <p style="font-size: 16px; color: #555;">
                  A new offer proposal has been made for your day off swap request.
                </p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #007bff;">Request Details</h3>
                  <p><strong>Request ID:</strong> ${requestId}</p>
                  <p><strong>Your Original Day Off:</strong> ${originalDayOff}</p>
                  <p><strong>Your Requested Day Off:</strong> ${requestedDayOff}</p>
                  <p><strong>Reason:</strong> ${reason}</p>
                </div>
                <p style="font-size: 16px; color: #555;">
                  Please log in to your account to review the offer and decide whether to accept it.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || '#'}" 
                     style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    View Request
                  </a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                <p style="font-size: 13px; color: #bbb; text-align: center;">
                  © ${new Date().getFullYear()} Shiftswaper. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'match_accepted':
        const matchMakerName = requestData.matchMaker?.fullName || 'Unknown Employee';
        subject = `Your Offer Proposal Has Been Accepted`;
        html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #28a745, #218838); padding: 24px 32px;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Offer Accepted!</h1>
              </div>
              <div style="padding: 30px 32px;">
                <p style="font-size: 16px; color: #333333;">Hello ${matchMakerName},</p>
                <p style="font-size: 16px; color: #555;">
                  Great news! Your offer proposal for the day off swap request has been accepted.
                </p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #28a745;">Accepted Offer Details</h3>
                  <p><strong>Request ID:</strong> ${requestId}</p>
                  <p><strong>Requester:</strong> ${requesterName}</p>
                  <p><strong>Your Original Day Off:</strong> ${originalDayOff}</p>
                  <p><strong>Day You Requested:</strong> ${requestedDayOff}</p>
                </div>
                <p style="font-size: 16px; color: #555;">
                  The request is now pending approval from the supervisors. You will be notified once a decision is made.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                <p style="font-size: 13px; color: #bbb; text-align: center;">
                  © ${new Date().getFullYear()} Shiftswaper. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'request_approved':
        subject = `Day Off Swap Request Approved`;
        html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #28a745, #218838); padding: 24px 32px;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Request Approved!</h1>
              </div>
              <div style="padding: 30px 32px;">
                <p style="font-size: 16px; color: #333333;">Hello,</p>
                <p style="font-size: 16px; color: #555;">
                  The day off swap request has been approved.
                </p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #28a745;">Approved Request Details</h3>
                  <p><strong>Request ID:</strong> ${requestId}</p>
                  <p><strong>Requester:</strong> ${requesterName}</p>
                  <p><strong>Original Day Off:</strong> ${originalDayOff}</p>
                  <p><strong>Requested Day Off:</strong> ${requestedDayOff}</p>
                  <p><strong>Reason:</strong> ${reason}</p>
                </div>
                <p style="font-size: 16px; color: #555;">
                  The day off swap is now confirmed.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                <p style="font-size: 13px; color: #bbb; text-align: center;">
                  © ${new Date().getFullYear()} Shiftswaper. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'request_rejected':
        const rejectionReason = requestData.comment || 'No reason provided';
        subject = `Day Off Swap Request Rejected`;
        html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #dc3545, #c82333); padding: 24px 32px;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Request Rejected</h1>
              </div>
              <div style="padding: 30px 32px;">
                <p style="font-size: 16px; color: #333333;">Hello,</p>
                <p style="font-size: 16px; color: #555;">
                  The day off swap request has been rejected.
                </p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #dc3545;">Rejected Request Details</h3>
                  <p><strong>Request ID:</strong> ${requestId}</p>
                  <p><strong>Requester:</strong> ${requesterName}</p>
                  <p><strong>Original Day Off:</strong> ${originalDayOff}</p>
                  <p><strong>Requested Day Off:</strong> ${requestedDayOff}</p>
                  <p><strong>Reason:</strong> ${reason}</p>
                  <p><strong>Rejection Reason:</strong> ${rejectionReason}</p>
                </div>
                <p style="font-size: 16px; color: #555;">
                  Please contact your supervisor if you have any questions.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                <p style="font-size: 13px; color: #bbb; text-align: center;">
                  © ${new Date().getFullYear()} Shiftswaper. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'supervisor_notification':
        const action = requestData.action || 'updated'; // 'approved', 'rejected', 'match_made', etc.
        subject = `Day Off Swap Request ${action.charAt(0).toUpperCase() + action.slice(1)}`;
        html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #17a2b8, #138496); padding: 24px 32px;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Supervisor Notification</h1>
              </div>
              <div style="padding: 30px 32px;">
                <p style="font-size: 16px; color: #333333;">Hello,</p>
                <p style="font-size: 16px; color: #555;">
                  A day off swap request requiring your attention has been ${action}.
                </p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #17a2b8;">Request Details</h3>
                  <p><strong>Request ID:</strong> ${requestId}</p>
                  <p><strong>Requester:</strong> ${requesterName}</p>
                  <p><strong>Original Day Off:</strong> ${originalDayOff}</p>
                  <p><strong>Requested Day Off:</strong> ${requestedDayOff}</p>
                  <p><strong>Reason:</strong> ${reason}</p>
                  ${action !== 'match_made' ? `<p><strong>Action:</strong> ${action.charAt(0).toUpperCase() + action.slice(1)}</p>` : ''}
                  ${requestData.comment ? `<p><strong>Comment:</strong> ${requestData.comment}</p>` : ''}
                </div>
                <p style="font-size: 16px; color: #555;">
                  Please log in to review and take necessary action.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || '#'}" 
                     style="display: inline-block; padding: 12px 24px; background-color: #17a2b8; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    View Request
                  </a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                <p style="font-size: 13px; color: #bbb; text-align: center;">
                  © ${new Date().getFullYear()} Shiftswaper. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      default:
        console.warn(`Unknown notification type: ${notificationType}`);
        return { success: false, error: 'Unknown notification type' };
    }

    const mailOptions = {
      from: `"Shiftswaper" <${process.env.EMAIL_USER}>`,
      to: recipient.email,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${recipient.email} for notification type: ${notificationType}`);
      return { success: true };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Inside the EmailService class, add this new method:
  async sendOTP(email, otp) {
    const mailOptions = {
      from: `"Shiftswaper" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Verification OTP Code",
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>OTP Verification</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #007bff, #0056d2); padding: 24px 32px;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Verify Your Email</h1>
          </div>
          <div style="padding: 30px 32px;">
            <p style="font-size: 16px; color: #333333;">Hello,</p>
            <p style="font-size: 16px; color: #555;">
              Thank you for registering with <strong>Shiftswaper</strong>. Use the OTP below to verify your email address.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; padding: 15px 20px; font-size: 24px; font-weight: bold; letter-spacing: 8px; background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 8px; color: #333;">
                ${otp}
              </div>
            </div>
            <p style="font-size: 16px; color: #555;">
              This code will expire in 10 minutes.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="font-size: 13px; color: #bbb; text-align: center;">
              © ${new Date().getFullYear()} Shiftswaper. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
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