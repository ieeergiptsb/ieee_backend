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
      // Disable connection pooling on Render (can cause timeout issues)
      // pool: true,
      // maxConnections: 5,
      // maxMessages: 100,
      // Increased timeouts for Render/cloud environments
      connectionTimeout: 60000, // 60 seconds (increased for Render network issues)
      socketTimeout: 60000, // 60 seconds (increased for Render network issues)
      greetingTimeout: 30000, // 30 seconds (increased for Render network issues)
      // TLS settings optimized for app passwords
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      // Enable debug for troubleshooting
      debug: false, // Disabled to reduce logs on Render
      logger: false,
    });

    // Try to verify connection, but don't fail if it times out (lazy verification)
    // This allows emails to be sent even if initial verification fails
    try {
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Verification timeout')), 20000)
        )
      ]);
      console.log('✅ Nodemailer transporter created and verified successfully');
    } catch (verifyError) {
      // Verification failed, but transporter might still work
      console.log('⚠️ Transporter verification timeout/skipped (will verify on first send)');
      console.log('📧 Transporter created (lazy verification mode)');
    }
    
    console.log('📧 Using App Password authentication (recommended for Gmail)');
    
    // Cache the transporter for reuse
    cachedTransporter = transporter;
    return transporter;
  } catch (error) {
    console.error('❌ Error creating SMTP transporter:', error.message);
    if (error.message.includes('Invalid login')) {
      console.error('⚠️ Authentication failed. Make sure you are using an App Password, not your regular password.');
      console.error('⚠️ For Gmail: Go to Google Account → Security → 2-Step Verification → App passwords');
    } else if (error.message.includes('timeout') || error.message.includes('Connection timeout')) {
      console.error('⚠️ Connection timeout. This might be a network issue on Render.');
      console.error('⚠️ The transporter will still be created - verification will happen on first email send.');
      // Still return transporter even if verification fails
      const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: false,
        auth: { user: user, pass: pass },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 30000,
        socketTimeout: 30000,
        greetingTimeout: 15000,
        tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
        debug: false,
        logger: false,
      });
      cachedTransporter = transporter;
      return transporter;
    }
    return null;
  }
};

// Send OTP email via nodemailer
export const sendOTPEmail = async (email, otpCode, type = 'registration') => {
  try {
    let transporter = await getSMTPTransporter();
    
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
    
    // Retry logic for Render network issues
    const maxRetries = 2;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📧 Attempt ${attempt}/${maxRetries} to send email...`);
        
        // Increased timeout for Render/cloud environments (60 seconds)
        const info = await Promise.race([
          transporter.sendMail(mailOptions),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SMTP timeout')), 60000)
          )
        ]);
        
        console.log('✅ Email sent successfully via nodemailer:', info.messageId);
        return { success: true, messageId: info.messageId };
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const waitTime = attempt * 2000; // 2s, 4s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Create a fresh transporter for retry (connection might be stale)
          try {
            cachedTransporter = null; // Clear cache
            const freshTransporter = await getSMTPTransporter();
            if (freshTransporter) {
              transporter = freshTransporter;
            }
          } catch (retryError) {
            console.warn('⚠️ Could not refresh transporter, continuing with existing one');
          }
        }
      }
    }
    
    // All retries failed
    throw lastError;
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
    let transporter = await getSMTPTransporter();
    
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
    
    // Retry logic for Render network issues
    const maxRetries = 2;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📧 Attempt ${attempt}/${maxRetries} to send confirmation email...`);
        
        // Increased timeout for Render/cloud environments (60 seconds)
        const info = await Promise.race([
          transporter.sendMail(mailOptions),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SMTP timeout')), 60000)
          )
        ]);
        
        console.log('✅ Registration confirmation email sent successfully via nodemailer:', info.messageId);
        return { success: true, messageId: info.messageId };
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const waitTime = attempt * 2000; // 2s, 4s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Create a fresh transporter for retry
          try {
            cachedTransporter = null; // Clear cache
            const freshTransporter = await getSMTPTransporter();
            if (freshTransporter) {
              transporter = freshTransporter;
            }
          } catch (retryError) {
            console.warn('⚠️ Could not refresh transporter, continuing with existing one');
          }
        }
      }
    }
    
    // All retries failed
    throw lastError;
  } catch (error) {
    console.error('❌ Error sending confirmation email via nodemailer:', error);
    return { success: false, error: error.message };
  }
};
