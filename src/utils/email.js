import sgMail from '@sendgrid/mail';
import { generateIDCard } from './idCardGenerator.js';

// Check if SendGrid is configured
const isSendGridConfigured = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const isConfigured = !!apiKey && apiKey.startsWith('SG.');
  return isConfigured;
};

// Initialize SendGrid
let sendGridInitialized = false;
let lastApiKey = null;

const initializeSendGrid = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  
  // Reinitialize if API key changed
  if (sendGridInitialized && lastApiKey === apiKey) {
    return;
  }
  
  if (!apiKey) {
    throw new Error('SendGrid API key is not set. Please set SENDGRID_API_KEY environment variable.');
  }
  
  if (!apiKey.startsWith('SG.')) {
    throw new Error(`SendGrid API key format is invalid. API key should start with "SG." but got: ${apiKey.substring(0, 10)}...`);
  }
  
  // Validate API key length (SendGrid keys are typically 69 characters)
  if (apiKey.length < 50) {
    console.warn('⚠️ SendGrid API key seems too short. Expected ~69 characters.');
  }
  
  sgMail.setApiKey(apiKey);
  lastApiKey = apiKey;
  sendGridInitialized = true;
  console.log('✅ SendGrid initialized successfully');
  console.log(`📋 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)`);
};

// Send OTP email via SendGrid
export const sendOTPEmail = async (email, otpCode, type = 'registration') => {
  try {
    initializeSendGrid();
    
    const subject = type === 'registration' 
      ? 'IEEE RGIPT - Email Verification Code'
      : 'IEEE RGIPT - OTP Code';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>IEEE RGIPT</h1>
          </div>
          <div class="content">
            <h2>${type === 'registration' ? 'Email Verification' : 'OTP Code'}</h2>
            <p>Hello,</p>
            <p>${type === 'registration' 
              ? 'Thank you for registering with IEEE RGIPT. Please use the following code to verify your email address:'
              : 'Please use the following OTP code:'}</p>
            
            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
            </div>
            
            <p>This code will expire in <strong>10 minutes</strong>.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2025 IEEE Student Branch, RGIPT. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const msg = {
      to: email,
      from: process.env.EMAIL_FROM || 'ieee_sb@rgipt.ac.in',
      subject: subject,
      html: html,
    };

    console.log(`📧 Sending OTP email via SendGrid to: ${email}`);
    const result = await sgMail.send(msg);
    console.log('✅ Email sent successfully via SendGrid');
    return { success: true, messageId: result[0]?.headers['x-message-id'] };
  } catch (error) {
    const errorDetails = error.response?.body?.errors || [];
    const errorMessage = errorDetails.length > 0 
      ? errorDetails.map(e => e.message || e).join('; ')
      : error.message;
    
    console.error('❌ SendGrid error:', errorMessage);
    console.error('Error code:', error.code);
    if (error.code === 401) {
      console.error('⚠️ SendGrid API key is invalid or unauthorized. Please check your SENDGRID_API_KEY environment variable.');
    }
    throw new Error(`SendGrid error: ${errorMessage}`);
  }
};

// Send registration confirmation email via SendGrid
export const sendRegistrationConfirmationEmail = async (email, eventName, teamName, userName = null, userPhoto = null, userCollege = null, userRollNo = null, membershipType = null, ieeeMembershipId = null) => {
  try {
    initializeSendGrid();
    
    // Check if this is CodeForHer event
    const isCodeForHer = eventName && (eventName.toLowerCase().includes('codeforher') || eventName.toLowerCase().includes('code for her'));
    const whatsappLink = 'https://chat.whatsapp.com/Llf1wdb3fo47F1GrCo5U5N';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .id-card-notice { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .whatsapp-box { background: #25D366; border: 1px solid #20bd5a; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .whatsapp-box a { color: white; text-decoration: none; font-weight: bold; display: inline-block; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 5px; }
          .whatsapp-box a:hover { background: rgba(255,255,255,0.3); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>IEEE RGIPT</h1>
          </div>
          <div class="content">
            <h2>Event Registration Confirmed!</h2>
            <p>Hello ${userName || 'there'},</p>
            <div class="success-box">
              <p><strong>Team:</strong> ${teamName}</p>
              <p><strong>Event:</strong> ${eventName}</p>
            </div>
            <p>Your registration for <strong>${eventName}</strong> has been confirmed successfully!</p>
            <div class="id-card-notice">
              <p><strong>📋 Your Event ID Card</strong></p>
              <p>Please find your official event ID card attached to this email. You can print it or show it on your mobile device at the event venue.</p>
            </div>
            ${isCodeForHer ? `
            <div class="whatsapp-box">
              <p style="color: white; margin-bottom: 10px;"><strong>📱 Join the Official WhatsApp Group</strong></p>
              <p style="color: white; margin-bottom: 15px; font-size: 14px;">Join our WhatsApp group to receive problem statements, updates, and mentor allocations.</p>
              <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer">Join WhatsApp Group</a>
            </div>
            ` : ''}
            <p>You will receive further instructions and updates via email. Please keep an eye on your inbox.</p>
            <p>Thank you for participating!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate ID card
    let idCardBuffer = null;
    try {
      idCardBuffer = await generateIDCard({
        userName: userName || 'Participant',
        userPhoto: userPhoto,
        teamName: teamName,
        eventName: eventName,
        userCollege: userCollege,
        userRollNo: userRollNo,
        membershipType: membershipType || 'non_member',
        ieeeMembershipId: ieeeMembershipId || null,
      });
      console.log('✅ ID card generated successfully');
    } catch (error) {
      console.error('⚠️ Failed to generate ID card:', error.message);
      // Continue without ID card if generation fails
    }

    const fromEmail = process.env.EMAIL_FROM || 'ieee_sb@rgipt.ac.in';
    
    // Validate sender email
    if (!fromEmail || !fromEmail.includes('@')) {
      throw new Error(`Invalid sender email: ${fromEmail}. Please set a valid EMAIL_FROM environment variable.`);
    }
    
    const msg = {
      to: email,
      from: fromEmail,
      subject: `Registration Confirmed - ${eventName}`,
      html: html,
    };
    
    console.log(`📤 Sender: ${fromEmail}, Recipient: ${email}`);

    // Attach ID card if generated
    if (idCardBuffer) {
      msg.attachments = [
        {
          content: idCardBuffer.toString('base64'),
          filename: `ID_Card_${eventName.replace(/[^a-z0-9]/gi, '_')}_${teamName.replace(/[^a-z0-9]/gi, '_')}.png`,
          type: 'image/png',
          disposition: 'attachment',
        },
      ];
    }

    console.log(`📧 Sending confirmation email via SendGrid to: ${email}`);
    
    try {
      const result = await sgMail.send(msg);
      console.log('✅ Email sent successfully via SendGrid');
      console.log(`📬 Message ID: ${result[0]?.headers['x-message-id'] || 'N/A'}`);
      return { success: true, messageId: result[0]?.headers['x-message-id'] };
    } catch (sendError) {
      const errorDetails = sendError.response?.body?.errors || [];
      const errorMessage = errorDetails.length > 0 
        ? errorDetails.map(e => `${e.message || e}${e.field ? ` (field: ${e.field})` : ''}`).join('; ')
        : sendError.message;
      
      console.error('❌ Error sending confirmation email:', errorMessage);
      console.error('Error code:', sendError.code);
      console.error('Full error:', JSON.stringify(sendError.response?.body || sendError.message, null, 2));
      
      if (sendError.code === 401) {
        console.error('\n⚠️ SendGrid Authentication Error - Possible causes:');
        console.error('  1. API key is invalid, expired, or revoked');
        console.error('  2. API key does not have "Mail Send" permissions');
        console.error('  3. Sender email is not verified in SendGrid');
        console.error('  4. API key was regenerated but server not restarted');
        console.error('\n🔧 Troubleshooting steps:');
        console.error('  1. Go to https://app.sendgrid.com/settings/api_keys');
        console.error('  2. Verify your API key exists and has "Mail Send" permission');
        console.error('  3. If needed, create a new API key with "Full Access" or "Mail Send" permission');
        console.error('  4. Go to https://app.sendgrid.com/settings/sender_auth');
        console.error('  5. Verify the sender email:', fromEmail);
        console.error('  6. Restart your server after updating environment variables');
      }
      
      throw new Error(`SendGrid error: ${errorMessage}`);
    }
  } catch (error) {
    console.error('❌ Error in sendRegistrationConfirmationEmail:', error.message);
    throw error;
  }
};

// Send password reset email via SendGrid
export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    initializeSendGrid();
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>IEEE RGIPT</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your IEEE RGIPT account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            <div class="warning-box">
              <p><strong>⚠️ Important:</strong></p>
              <ul>
                <li>This link will expire in <strong>1 hour</strong></li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Your password will remain unchanged if you don't click the link</li>
              </ul>
            </div>
            <p>For security reasons, never share this link with anyone.</p>
          </div>
          <div class="footer">
            <p>© 2025 IEEE Student Branch, RGIPT. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const msg = {
      to: email,
      from: process.env.EMAIL_FROM || 'ieee_sb@rgipt.ac.in',
      subject: 'IEEE RGIPT - Password Reset Request',
      html: html,
    };

    console.log(`📧 Sending password reset email via SendGrid to: ${email}`);
    const result = await sgMail.send(msg);
    console.log('✅ Email sent successfully via SendGrid');
    return { success: true, messageId: result[0]?.headers['x-message-id'] };
  } catch (error) {
    const errorDetails = error.response?.body?.errors || [];
    const errorMessage = errorDetails.length > 0 
      ? errorDetails.map(e => e.message || e).join('; ')
      : error.message;
    
    console.error('❌ SendGrid error:', errorMessage);
    console.error('Error code:', error.code);
    if (error.code === 401) {
      console.error('⚠️ SendGrid API key is invalid or unauthorized. Please check your SENDGRID_API_KEY environment variable.');
    }
    throw new Error(`SendGrid error: ${errorMessage}`);
  }
};

// Send contact form email via SendGrid
export const sendContactFormEmail = async ({ fromName, fromEmail, subject, message }) => {
  try {
    initializeSendGrid();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; }
          .message-box { background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>IEEE RGIPT - New Contact Form Submission</h1>
          </div>
          <div class="content">
            <h2>You have received a new message from the website contact form</h2>
            
            <div class="info-box">
              <p><strong>From:</strong> ${fromName}</p>
              <p><strong>Email:</strong> <a href="mailto:${fromEmail}">${fromEmail}</a></p>
              <p><strong>Subject:</strong> ${subject}</p>
            </div>
            
            <div class="message-box">
              <p><strong>Message:</strong></p>
              <p>${message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <p style="margin-top: 20px;">
              <strong>Reply to:</strong> <a href="mailto:${fromEmail}">${fromEmail}</a>
            </p>
          </div>
          <div class="footer">
            <p>© 2025 IEEE Student Branch, RGIPT. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const msg = {
      to: 'ieee_sb@rgipt.ac.in',
      from: process.env.EMAIL_FROM || 'ieee_sb@rgipt.ac.in',
      replyTo: fromEmail,
      subject: `[Contact Form] ${subject}`,
      html: html,
    };

    console.log(`📧 Sending contact form email via SendGrid from: ${fromEmail}`);
    const result = await sgMail.send(msg);
    console.log('✅ Contact form email sent successfully via SendGrid');
    return { success: true, messageId: result[0]?.headers['x-message-id'] };
  } catch (error) {
    const errorDetails = error.response?.body?.errors || [];
    const errorMessage = errorDetails.length > 0 
      ? errorDetails.map(e => e.message || e).join('; ')
      : error.message;
    
    console.error('❌ SendGrid error:', errorMessage);
    console.error('Error code:', error.code);
    if (error.code === 401) {
      console.error('⚠️ SendGrid API key is invalid or unauthorized. Please check your SENDGRID_API_KEY environment variable.');
    }
    throw new Error(`SendGrid error: ${errorMessage}`);
  }
};

// Test SendGrid configuration (for debugging)
export const testSendGridConnection = async () => {
  try {
    initializeSendGrid();
    
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'ieee_sb@rgipt.ac.in';
    
    console.log('\n🔍 SendGrid Configuration Test:');
    console.log(`   API Key: ${apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)` : 'NOT SET'}`);
    console.log(`   Sender Email: ${fromEmail}`);
    console.log(`   Initialized: ${sendGridInitialized}`);
    
    console.log('\n✅ SendGrid is configured correctly.');
    console.log('⚠️  If you still get 401 errors, check:');
    console.log('   1. Sender email is verified: https://app.sendgrid.com/settings/sender_auth');
    console.log('   2. API key has "Mail Send" permission: https://app.sendgrid.com/settings/api_keys');
    console.log('   3. Server was restarted after setting environment variables\n');
    
    return { success: true, apiKeySet: !!apiKey, senderEmail: fromEmail };
  } catch (error) {
    console.error('❌ SendGrid configuration test failed:', error.message);
    return { success: false, error: error.message };
  }
};
