import nodemailer from 'nodemailer';

// Create transporter function for SMTP (nodemailer)
// Uses connection pooling for faster delivery
let cachedTransporter = null;

const getSMTPTransporter = async () => {
  // Return cached transporter if available and verified
  if (cachedTransporter) {
    return cachedTransporter;
  }
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587');
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  console.log('📧 Nodemailer SMTP Config:', { 
    host, 
    port, 
    user: user ? `${user.substring(0, 5)}***` : 'NOT SET',
    pass: pass ? '***SET***' : 'NOT SET'
  });

  if (!user || !pass) {
    console.warn('⚠️ SMTP credentials not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.');
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass, // Use Gmail App Password here for best performance
      },
      // Connection pooling for faster delivery (reuses connections)
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // Optimized timeouts for faster response
      connectionTimeout: 10000, // 10 seconds
      socketTimeout: 10000, // 10 seconds
      greetingTimeout: 5000, // 5 seconds
      // TLS settings optimized for app passwords
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      // Enable debug for troubleshooting (set to false in production)
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
    });

    // Verify connection on creation
    await transporter.verify();
    console.log('✅ Nodemailer transporter created and verified successfully');
    console.log('📧 Using App Password authentication (recommended for Gmail)');
    
    // Cache the transporter for reuse
    cachedTransporter = transporter;
    return transporter;
  } catch (error) {
    console.error('❌ Error creating SMTP transporter:', error.message);
    if (error.message.includes('Invalid login')) {
      console.error('⚠️ Authentication failed. Make sure you are using an App Password, not your regular password.');
      console.error('⚠️ For Gmail: Go to Google Account → Security → 2-Step Verification → App passwords');
    }
    return null;
  }
};

// Send OTP email via nodemailer
export const sendOTPEmail = async (email, otpCode, type = 'registration') => {
  try {
    const transporter = await getSMTPTransporter();
    
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

    console.log(`📧 Sending OTP email via nodemailer to: ${email}`);
    
    // Reduced timeout for faster failure detection
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP timeout')), 10000)
      )
    ]);
    
    console.log('✅ Email sent successfully via nodemailer:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email via nodemailer:', error.message);
    // Log OTP to console for development/debugging
    console.log(`📧 OTP Code for ${email}: ${otpCode}`);
    return { success: false, error: error.message, otpCode: otpCode };
  }
};

// Send registration confirmation email via nodemailer
export const sendRegistrationConfirmationEmail = async (email, eventName, teamName) => {
  try {
    const transporter = await getSMTPTransporter();
    
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

    console.log(`📧 Sending registration confirmation email via nodemailer to: ${email}`);
    
    // Reduced timeout for faster failure detection
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP timeout')), 10000)
      )
    ]);
    
    console.log('✅ Registration confirmation email sent successfully via nodemailer:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending confirmation email via nodemailer:', error);
    return { success: false, error: error.message };
  }
};
