const SibApiV3Sdk = require('sib-api-v3-sdk');





class EmailService {
  constructor() {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    this.defaultSender = {
      email: process.env.BREVO_SENDER_EMAIL,
      name: "SCILEMS Support"
    };

    this.defaultCc = [
  { email: process.env.BREVO_CC_EMAIL }
];
  }

  /**
   * Send a generic email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} textContent - Plain text content
   * @param {string} htmlContent - HTML content
   * @param {Object} sender - Optional custom sender
   */
async sendEmail(to, subject, textContent, htmlContent, sender = null, cc = null) {
  const emailContent = {
    sender: sender || this.defaultSender,
    to: [{ email: to }],
    cc: cc || this.defaultCc,   // 👈 Added CC support
    subject,
    textContent,
    htmlContent
  };

  try {
    const data = await this.apiInstance.sendTransacEmail(emailContent);
    console.log('Email sent successfully. Message ID:', data.messageId);
    return data;
  } catch (error) {
    console.error('Error sending email via Brevo:', error);
    throw error;
  }
}



  /**
   * Send borrow request approved email
   */
  async sendBorrowRequestApprovedEmail(userEmail, userName, transactionId, borrowedItems, pickUpDate) {
    const subject = 'SCILEMS - Your Borrow Request Has Been Approved';

    const itemsList = borrowedItems.map(item => {
      const itemName = (typeof item.eqID === 'object' && item.eqID?.name)
        ? item.eqID.name
        : item.name || 'Equipment Item';
      return `• ${itemName} (Quantity: ${item.quantity})`;
    }).join('\n');

    const itemsListHtml = borrowedItems.map(item => {
      const itemName = (typeof item.eqID === 'object' && item.eqID?.name)
        ? item.eqID.name
        : item.name || 'Equipment Item';
      return `<li>${itemName} <strong>(Quantity: ${item.quantity})</strong></li>`;
    }).join('');

    const pickUpDateStr = pickUpDate ? new Date(pickUpDate).toLocaleDateString() : 'To be determined';

    const textContent = `
Hello ${userName},

Great news! Your borrow request has been approved.

Transaction ID: ${transactionId}

Approved Items:
${itemsList}

Pick-up Date: ${pickUpDateStr}

Please make sure to pick up your items on the scheduled date. If you need to reschedule, please contact our support team.

Thank you for using SCILEMS!
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #28a745;">✅ Request Approved!</h2>
        </div>
        
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Great news! Your borrow request has been approved.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Transaction ID:</strong> ${transactionId}</p>
          <p><strong>Pick-up Date:</strong> ${pickUpDateStr}</p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #333; margin-bottom: 10px;">Approved Items:</h3>
          <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            ${itemsListHtml}
          </ul>
        </div>

        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; margin: 20px 0;">
          <p><strong>📋 Next Steps:</strong></p>
          <p>Please make sure to pick up your items on the scheduled date. If you need to reschedule, please contact our support team.</p>
        </div>

        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #666;">
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `;

    return await this.sendEmail(userEmail, subject, textContent, htmlContent);
  }

  /**
   * Send items borrowed confirmation email
   */
  async sendItemsBorrowedEmail(userEmail, userName, transactionId, borrowedItems, returnDate) {
    const subject = 'SCILEMS - Items Successfully Borrowed';

    const itemsList = borrowedItems.map(item => {
      const itemName = (typeof item.eqID === 'object' && item.eqID?.name)
        ? item.eqID.name
        : item.name || 'Equipment Item';
      return `• ${itemName} (Quantity: ${item.quantity})`;
    }).join('\n');

    const itemsListHtml = borrowedItems.map(item => {
      const itemName = (typeof item.eqID === 'object' && item.eqID?.name)
        ? item.eqID.name
        : item.name || 'Equipment Item';
      return `<li>${itemName} <strong>(Quantity: ${item.quantity})</strong></li>`;
    }).join('');

    const returnDateStr = new Date(returnDate).toLocaleDateString();
    const borrowDateStr = new Date().toLocaleDateString();

    const textContent = `
Hello ${userName},

Your items have been successfully borrowed from SCILEMS!

Transaction ID: ${transactionId}
Borrow Date: ${borrowDateStr}
Return Date: ${returnDateStr}

Borrowed Items:
${itemsList}

IMPORTANT REMINDER:
Please return all items by ${returnDateStr} to avoid any late fees or penalties.

If you need to extend your borrowing period or have any questions, please contact our support team as soon as possible.

Thank you for using SCILEMS!
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #28a745;">✅ Items Successfully Borrowed!</h2>
        </div>
        
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Your items have been successfully borrowed from SCILEMS!</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Transaction ID:</strong> ${transactionId}</p>
          <p><strong>Borrow Date:</strong> ${borrowDateStr}</p>
          <p><strong>Return Date:</strong> ${returnDateStr}</p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #333; margin-bottom: 10px;">Borrowed Items:</h3>
          <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            ${itemsListHtml}
          </ul>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <p><strong>⚠️ IMPORTANT REMINDER:</strong></p>
          <p>Please return all items by <strong>${returnDateStr}</strong> to avoid any late fees or penalties.</p>
        </div>

        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; margin: 20px 0;">
          <p><strong>📞 Need Help?</strong></p>
          <p>If you need to extend your borrowing period or have any questions, please contact our support team as soon as possible.</p>
        </div>

        <p>Thank you for using SCILEMS!</p>
        
        <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #666;">
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `;

    return await this.sendEmail(userEmail, subject, textContent, htmlContent);
  }

  /**
   * Send borrow request rejected email
   */
  async sendBorrowRequestRejectedEmail(userEmail, userName, transactionId, reason = null) {
    const subject = 'SCILEMS - Borrow Request Update';

    const reasonText = reason ? `\n\nReason: ${reason}` : '';

    const textContent = `
Hello ${userName},

We regret to inform you that your borrow request has not been approved.

Transaction ID: ${transactionId}${reasonText}

If you have any questions or would like to discuss this decision, please contact our support team.

Thank you for using SCILEMS!
    `;

    const reasonHtml = reason ? `
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
        <p><strong>Reason:</strong> ${reason}</p>
      </div>
    ` : '';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #dc3545;">Borrow Request Update</h2>
        </div>
        
        <p>Hello <strong>${userName}</strong>,</p>
        <p>We regret to inform you that your borrow request has not been approved.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Transaction ID:</strong> ${transactionId}</p>
        </div>

        ${reasonHtml}

        <p>If you have any questions or would like to discuss this decision, please contact our support team.</p>
        
        <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #666;">
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `;

    return await this.sendEmail(userEmail, subject, textContent, htmlContent);
  }

  /**
   * Send reminder email (for overdue items, pickup reminders, etc.)
   */
  async sendReminderEmail(userEmail, userName, reminderType, details) {
    let subject, textContent, htmlContent;

    switch (reminderType) {
      case 'pickup':
        subject = 'SCILEMS - Pickup Reminder';
        textContent = `
Hello ${userName},

This is a friendly reminder that you have items ready for pickup.

Transaction ID: ${details.transactionId}
Scheduled Pickup Date: ${details.pickUpDate}

Please collect your items as soon as possible.

Thank you!
        `;

        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #ffc107;">📅 Pickup Reminder</h2>
            </div>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>This is a friendly reminder that you have items ready for pickup.</p>
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Transaction ID:</strong> ${details.transactionId}</p>
              <p><strong>Scheduled Pickup Date:</strong> ${details.pickUpDate}</p>
            </div>
            <p>Please collect your items as soon as possible.</p>
            <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #666;">
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        `;
        break;

      case 'overdue':
        subject = 'SCILEMS - Item Return Overdue';
        textContent = `
Hello ${userName},

Your borrowed items are now overdue for return.

Transaction ID: ${details.transactionId}
Due Date: ${details.dueDate}

Please return the items immediately to avoid additional charges.

Thank you!
        `;

        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #dc3545;">⚠️ Items Overdue</h2>
            </div>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your borrowed items are now overdue for return.</p>
            <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <p><strong>Transaction ID:</strong> ${details.transactionId}</p>
              <p><strong>Due Date:</strong> ${details.dueDate}</p>
            </div>
            <p><strong>Please return the items immediately to avoid additional charges.</strong></p>
            <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #666;">
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        `;
        break;

      default:
        throw new Error(`Unknown reminder type: ${reminderType}`);
    }

    return await this.sendEmail(userEmail, subject, textContent, htmlContent);
  }
}

const emailService = new EmailService();

module.exports = emailService;