const SibApiV3Sdk = require('sib-api-v3-sdk');

const sendAccountCreationEmail = async (userEmail, username, password) => {
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;
  
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  
  const sender = {
    email: process.env.BREVO_SENDER_EMAIL,
    name: "SCILEMS Support"
  };
  
  const receivers = [
    { email: userEmail }
  ];

  // ✅ Default CC (admin/support copy)
  const defaultCc = [
    { email: process.env.BREVO_CC_EMAIL }
  ];
  
  const emailContent = {
    sender,
    to: receivers,
    cc: defaultCc,   // 👈 Always CC admin/support
    subject: 'Welcome to SCILEMS - Your Account Information',
    textContent: `
      Welcome to SCILEMS!
      
      Your account has been created by an administrator.
      
      Username: ${username}
      Temporary Password: ${password}
      
      Please log in using these credentials and change your password immediately for security purposes.
      
      Thank you for using SCILEMS!
    `,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin: 0;">Welcome to <span style="color: #3498db;">SCILEMS</span>!</h2>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.5;">
          Your account has been created by an administrator. Below are your login credentials:
        </p>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e0e0e0;">
          <p style="margin: 0; font-size: 15px;"><strong>Username:</strong> ${username}</p>
          <p style="margin: 5px 0 0; font-size: 15px;"><strong>Temporary Password:</strong> ${password}</p>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.5;">
          Please log in using these credentials and <strong>change your password immediately</strong> for security purposes.
        </p>

        <div style="text-align: center; margin: 25px 0;">
          <a href="https://scilems.pages.dev/home" 
            style="display: inline-block; padding: 12px 25px; background-color: #3498db; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 15px;">
            Go to SCILEMS
          </a>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.5;">
          If you have any questions, please contact our support team.
        </p>

        <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #777;">
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `
  };
  
  try {
    const data = await apiInstance.sendTransacEmail(emailContent);
    console.log('Email sent successfully. Message ID:', data.messageId);
    return data;
  } catch (error) {
    console.error('Error sending email via Brevo:', error);
    throw error;
  }
};

module.exports = {
  sendAccountCreationEmail
};
