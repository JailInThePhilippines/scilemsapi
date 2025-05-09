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
    {
      email: userEmail
    }
  ];
  
  const emailContent = {
    sender,
    to: receivers,
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #333;">Welcome to SCILEMS!</h2>
        </div>
        <p>Your account has been created by an administrator.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Temporary Password:</strong> ${password}</p>
        </div>
        <p>Please log in using these credentials and change your password immediately for security purposes.</p>
        <p>If you have any questions, please contact our support team.</p>
        <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #666;">
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