import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

// Check if SendGrid is configured
const isSendGridConfigured = () => {
  return !!process.env.SENDGRID_API_KEY;
};

// Initialize SendGrid - called lazily to ensure env vars are loaded
let sendGridInitialized = false;
const initializeSendGrid = () => {
  if (sendGridInitialized) return;
  
  // Debug logging
  const apiKey = process.env.SENDGRID_API_KEY;
  console.log('🔍 Checking SendGrid configuration...');
  console.log('🔍 SENDGRID_API_KEY exists:', !!apiKey);
  console.log('🔍 SENDGRID_API_KEY length:', apiKey ? apiKey.length : 0);
  console.log('🔍 SENDGRID_API_KEY starts with SG:', apiKey ? apiKey.startsWith('SG.') : false);
  
  if (isSendGridConfigured()) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('✅ SendGrid configured successfully');
    sendGridInitialized = true;
  } else {
    console.log('⚠️ SendGrid API key not found, will use SMTP fallback');
    console.log('⚠️ Make sure SENDGRID_API_KEY is set in Render environment variables');
    sendGridInitialized = true; // Mark as initialized to avoid repeated logs
  }
};

// Create transporter function for SMTP (fallback)
const getSMTPTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587');
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  console.log('📧 SMTP Config:', { 
    host, 
    port, 
    user: user ? `${user.substring(0, 5)}***` : 'NOT SET',
    pass: pass ? '***SET***' : 'NOT SET'
  });

  if (!user || !pass) {
    console.warn('⚠️ SMTP credentials not configured.');
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 15000,
      socketTimeout: 15000,
      greetingTimeout: 15000,
    });

    return transporter;
  } catch (error) {
    console.error('❌ Error creating SMTP transporter:', error);
    return null;
  }
};

// Send email via SendGrid
const sendOTPEmailViaSendGrid = async (email, otpCode, type = 'registration') => {
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
    from: process.env.EMAIL_FROM || 'kanhajagatdata@gmail.com',
    subject: subject,
    html: html,
  };

  try {
    const result = await Promise.race([
      sgMail.send(msg),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SendGrid timeout')), 15000)
      )
    ]);
    console.log('✅ Email sent via SendGrid:', result[0]?.statusCode);
    return { success: true, messageId: result[0]?.headers['x-message-id'] };
  } catch (error) {
    console.error('❌ Error sending email via SendGrid:', error.message);
    throw error;
  }
};

export const sendOTPEmail = async (email, otpCode, type = 'registration') => {
  try {
    // Initialize SendGrid (lazy initialization)
    initializeSendGrid();
    
    // Try SendGrid first if configured
    const sendGridAvailable = isSendGridConfigured();
    console.log('📧 Attempting to send email via:', sendGridAvailable ? 'SendGrid' : 'SMTP');
    
    if (sendGridAvailable) {
      try {
        console.log('📧 Sending via SendGrid to:', email);
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

    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP timeout')), 15000)
      )
    ]);
    console.log('✅ Email sent successfully via SMTP:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    // Log OTP to console for development
    console.log(`📧 OTP Code for ${email}: ${otpCode}`);
    return { success: false, error: error.message, otpCode: otpCode };
  }
};

// Send confirmation email via SendGrid
const sendConfirmationEmailViaSendGrid = async (email, eventName, teamName) => {
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>IEEE RGIPT</h1>
        </div>
        <div class="content">
          <h2>Event Registration Confirmed!</h2>
          <p>Hello,</p>
          <div class="success-box">
            <p><strong>Team:</strong> ${teamName}</p>
            <p><strong>Event:</strong> ${eventName}</p>
          </div>
          <p>Your registration for <strong>${eventName}</strong> has been confirmed successfully!</p>
          <p>You will receive further instructions and updates via email. Please keep an eye on your inbox.</p>
          <p>Thank you for participating!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const msg = {
    to: email,
    from: process.env.EMAIL_FROM || 'kanhajagatdata@gmail.com',
    subject: `Registration Confirmed - ${eventName}`,
    html: html,
  };

  try {
    const result = await Promise.race([
      sgMail.send(msg),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SendGrid timeout')), 15000)
      )
    ]);
    return { success: true, messageId: result[0]?.headers['x-message-id'] };
  } catch (error) {
    console.error('Error sending confirmation email via SendGrid:', error);
    throw error;
  }
};

export const sendRegistrationConfirmationEmail = async (email, eventName, teamName) => {
  try {
    // Initialize SendGrid (lazy initialization)
    initializeSendGrid();
    
    // Try SendGrid first if configured
    if (isSendGridConfigured()) {
      try {
        return await sendConfirmationEmailViaSendGrid(email, eventName, teamName);
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>IEEE RGIPT</h1>
          </div>
          <div class="content">
            <h2>Event Registration Confirmed!</h2>
            <p>Hello,</p>
            <div class="success-box">
              <p><strong>Team:</strong> ${teamName}</p>
              <p><strong>Event:</strong> ${eventName}</p>
            </div>
            <p>Your registration for <strong>${eventName}</strong> has been confirmed successfully!</p>
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

    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP timeout')), 15000)
      )
    ]);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, error: error.message };
  }
};
