import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { generateIDCard } from './idCardGenerator.js';

// Check if SendGrid is configured
const isSendGridConfigured = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const isConfigured = !!apiKey && apiKey.startsWith('SG.');
  console.log(`🔍 SendGrid configured: ${isConfigured}`);
  return isConfigured;
};

// Initialize SendGrid
let sendGridInitialized = false;
const initializeSendGrid = () => {
  if (sendGridInitialized) return;
  
  if (isSendGridConfigured()) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('✅ SendGrid initialized successfully');
    sendGridInitialized = true;
  } else {
    console.log('⚠️ SendGrid not configured, will use SMTP fallback');
    sendGridInitialized = true;
  }
};

// Create SMTP transporter (fallback only)
const getSMTPTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587');
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const secure = port === 465;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: { user: user, pass: pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 30000,
    socketTimeout: 30000,
  });
};

// Send OTP email via SendGrid
const sendOTPEmailViaSendGrid = async (email, otpCode, type = 'registration') => {
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

  try {
    const result = await sgMail.send(msg);
    console.log('✅ Email sent successfully via SendGrid');
    return { success: true, messageId: result[0]?.headers['x-message-id'] };
  } catch (error) {
    console.error('❌ SendGrid error:', error.message);
    throw error;
  }
};

// Send OTP email (SendGrid primary, SMTP fallback)
export const sendOTPEmail = async (email, otpCode, type = 'registration') => {
  try {
    // Try SendGrid first
    if (isSendGridConfigured()) {
      try {
        console.log(`📧 Sending OTP email via SendGrid to: ${email}`);
        return await sendOTPEmailViaSendGrid(email, otpCode, type);
      } catch (error) {
        console.warn('⚠️ SendGrid failed, trying SMTP fallback:', error.message);
        // Fall through to SMTP
      }
    }

    // Fallback to SMTP
    const transporter = getSMTPTransporter();
    if (!transporter) {
      console.log(`📧 OTP Code for ${email}: ${otpCode}`);
      return { success: false, error: 'Email service not configured', otpCode: otpCode };
    }

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

    const mailOptions = {
      from: `"IEEE RGIPT" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: html,
    };

    console.log(`📧 Sending OTP email via SMTP to: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully via SMTP:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.log(`📧 OTP Code for ${email}: ${otpCode}`);
    return { success: false, error: error.message, otpCode: otpCode };
  }
};

// Send confirmation email via SendGrid
const sendConfirmationEmailViaSendGrid = async (email, eventName, teamName, userName, userPhoto, userCollege, userRollNo, membershipType, ieeeMembershipId) => {
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

  const msg = {
    to: email,
    from: process.env.EMAIL_FROM || 'ieee_sb@rgipt.ac.in',
    subject: `Registration Confirmed - ${eventName}`,
    html: html,
  };

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

  try {
    const result = await sgMail.send(msg);
    return { success: true, messageId: result[0]?.headers['x-message-id'] };
  } catch (error) {
    console.error('❌ SendGrid error:', error.message);
    throw error;
  }
};

// Send registration confirmation email (SendGrid primary, SMTP fallback)
export const sendRegistrationConfirmationEmail = async (email, eventName, teamName, userName = null, userPhoto = null, userCollege = null, userRollNo = null, membershipType = null, ieeeMembershipId = null) => {
  try {
    // Try SendGrid first
    if (isSendGridConfigured()) {
      try {
        console.log(`📧 Sending confirmation email via SendGrid to: ${email}`);
        return await sendConfirmationEmailViaSendGrid(email, eventName, teamName, userName, userPhoto, userCollege, userRollNo, membershipType, ieeeMembershipId);
      } catch (error) {
        console.warn('⚠️ SendGrid failed, trying SMTP fallback:', error.message);
        // Fall through to SMTP
      }
    }

    // Fallback to SMTP
    const transporter = getSMTPTransporter();
    if (!transporter) {
      console.log(`📧 Registration confirmation for ${email}: ${eventName} - ${teamName}`);
      return { success: false, error: 'Email service not configured' };
    }

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
            ${idCardBuffer ? `
            <div class="id-card-notice">
              <p><strong>📋 Your Event ID Card</strong></p>
              <p>Please find your official event ID card attached to this email. You can print it or show it on your mobile device at the event venue.</p>
            </div>
            ` : ''}
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

    const mailOptions = {
      from: `"IEEE RGIPT" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: `Registration Confirmed - ${eventName}`,
      html: html,
    };

    // Attach ID card if generated
    if (idCardBuffer) {
      mailOptions.attachments = [
        {
          filename: `ID_Card_${eventName.replace(/[^a-z0-9]/gi, '_')}_${teamName.replace(/[^a-z0-9]/gi, '_')}.png`,
          content: idCardBuffer,
        },
      ];
    }

    console.log(`📧 Sending confirmation email via SMTP to: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending confirmation email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email via SendGrid
const sendPasswordResetEmailViaSendGrid = async (email, resetToken, resetUrl) => {
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

  try {
    const result = await sgMail.send(msg);
    return { success: true, messageId: result[0]?.headers['x-message-id'] };
  } catch (error) {
    console.error('❌ SendGrid error:', error.message);
    throw error;
  }
};

// Send password reset email (SendGrid primary, SMTP fallback)
export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Try SendGrid first
    if (isSendGridConfigured()) {
      try {
        console.log(`📧 Sending password reset email via SendGrid to: ${email}`);
        return await sendPasswordResetEmailViaSendGrid(email, resetToken, resetUrl);
      } catch (error) {
        console.warn('⚠️ SendGrid failed, trying SMTP fallback:', error.message);
        // Fall through to SMTP
      }
    }

    // Fallback to SMTP
    const transporter = getSMTPTransporter();
    if (!transporter) {
      console.log(`📧 Password reset requested for ${email}`);
      return { success: false, error: 'Email service not configured' };
    }

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

    const mailOptions = {
      from: `"IEEE RGIPT" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'IEEE RGIPT - Password Reset Request',
      html: html,
    };

    console.log(`📧 Sending password reset email via SMTP to: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Send contact form email via SendGrid
const sendContactFormEmailViaSendGrid = async ({ fromName, fromEmail, subject, message }) => {
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

  try {
    const result = await sgMail.send(msg);
    console.log('✅ Contact form email sent successfully via SendGrid');
    return { success: true, messageId: result[0]?.headers['x-message-id'] };
  } catch (error) {
    console.error('❌ SendGrid error:', error.message);
    throw error;
  }
};

// Send contact form email (SendGrid primary, SMTP fallback)
export const sendContactFormEmail = async ({ fromName, fromEmail, subject, message }) => {
  try {
    // Try SendGrid first
    if (isSendGridConfigured()) {
      try {
        console.log(`📧 Sending contact form email via SendGrid from: ${fromEmail}`);
        return await sendContactFormEmailViaSendGrid({ fromName, fromEmail, subject, message });
      } catch (error) {
        console.warn('⚠️ SendGrid failed, trying SMTP fallback:', error.message);
        // Fall through to SMTP
      }
    }

    // Fallback to SMTP
    const transporter = getSMTPTransporter();
    if (!transporter) {
      console.log(`📧 Contact form submission from ${fromName} (${fromEmail}): ${subject}`);
      return { success: false, error: 'Email service not configured' };
    }

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

    const mailOptions = {
      from: `"IEEE RGIPT Contact Form" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: 'ieee_sb@rgipt.ac.in',
      replyTo: fromEmail,
      subject: `[Contact Form] ${subject}`,
      html: html,
    };

    console.log(`📧 Sending contact form email via SMTP from: ${fromEmail}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Contact form email sent successfully via SMTP:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending contact form email:', error);
    return { success: false, error: error.message };
  }
};
