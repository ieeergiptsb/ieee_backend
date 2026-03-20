import { Resend } from 'resend';
import { generateIDCard } from './idCardGenerator.js';

let resendClient = null;

const getResendClient = () => {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY is not set. Emails will fail to send.');
  }

  // If no API key is provided, we still instantiate it but it will throw on send.
  resendClient = new Resend(apiKey || 'uninitialized');
  return resendClient;
};

const getFromEmail = () => {
  return process.env.EMAIL_FROM || 'IEEE RGIPT <onboarding@resend.dev>';
};

// Send OTP email
export const sendOTPEmail = async (email, otpCode, type = 'registration') => {
  try {
    const resend = getResendClient();
    
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

    console.log(`📧 Sending OTP email via Resend to: ${email}`);
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: email,
      subject,
      html
    });
    
    if (error) throw new Error(error.message);

    console.log('✅ Email sent successfully');
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('❌ Resend error:', error.message);
    throw new Error(`Email error: ${error.message}`);
  }
};

// Send registration confirmation email
export const sendRegistrationConfirmationEmail = async (email, eventName, teamName, userName = null, userPhoto = null, userCollege = null, userRollNo = null, membershipType = null, ieeeMembershipId = null) => {
  try {
    const resend = getResendClient();
    
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>IEEE RGIPT</h1></div>
          <div class="content">
            <h2>Event Registration Confirmed!</h2>
            <p>Hello ${userName || 'there'},</p>
            <div class="success-box">
              <p><strong>Team:</strong> ${teamName}</p>
              <p><strong>Event:</strong> ${eventName}</p>
            </div>
            <p>Your registration for <strong>${eventName}</strong> has been confirmed successfully!</p>
            ${isCodeForHer ? `
            <div class="whatsapp-box" style="background: #25D366; padding: 15px; border-radius: 8px; text-align: center;">
              <a href="${whatsappLink}" style="color: white; font-weight: bold; text-decoration: none;">Join WhatsApp Group</a>
            </div>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    let attachments = [];
    try {
      const idCardBuffer = await generateIDCard({
        userName: userName || 'Participant',
        userPhoto, teamName, eventName, userCollege, userRollNo,
        membershipType: membershipType || 'non_member',
        ieeeMembershipId: ieeeMembershipId || null,
      });
      if (idCardBuffer) {
        attachments.push({
          filename: `ID_Card_${eventName.replace(/[^a-z0-9]/gi, '_')}.png`,
          content: idCardBuffer
        });
      }
    } catch (e) {
      console.error('⚠️ Failed to generate ID card:', e.message);
    }

    console.log(`📧 Sending confirmation via Resend to: ${email}`);
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: email,
      subject: `Registration Confirmed - ${eventName}`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined
    });
    
    if (error) throw new Error(error.message);

    console.log('✅ Email sent successfully');
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('❌ Resend error:', error.message);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resend = getResendClient();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const html = `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`;

    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: email,
      subject: 'IEEE RGIPT - Password Reset Request',
      html
    });
    
    if (error) throw new Error(error.message);

    return { success: true, messageId: data?.id };
  } catch (error) {
    throw new Error(`Email error: ${error.message}`);
  }
};

export const sendContactFormEmail = async ({ fromName, fromEmail, subject, message }) => {
  try {
    const resend = getResendClient();
    const html = `<p>From: ${fromName} (${fromEmail})</p><p>${message}</p>`;

    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: 'ieee_sb@rgipt.ac.in',
      reply_to: fromEmail,
      subject: `[Contact Form] ${subject}`,
      html
    });
    
    if (error) throw new Error(error.message);

    return { success: true, messageId: data?.id };
  } catch (error) {
    throw new Error(`Email error: ${error.message}`);
  }
};

export const sendTeamInviteEmail = async (email, teamName, inviteToken) => {
  try {
    const resend = getResendClient();
    const frontendUrl = process.env.KODEKURRENT_FRONTEND_URL || 'https://kodekurrent.ieeergipt.in';
    const verifyUrl = `${frontendUrl}/verify-team?token=${inviteToken}`;
    
    const html = `
      <p>You have been invited to join the team <strong>${teamName}</strong> for the KodeKurrent 2.0 Hackathon.</p>
      <p>Click <a href="${verifyUrl}">here</a> to accept the invitation.</p>
    `;

    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: email,
      subject: `KodeKurrent 2.0 - Team Invitation: ${teamName}`,
      html
    });
    
    if (error) throw new Error(error.message);

    return { success: true, messageId: data?.id };
  } catch (error) {
    throw new Error(`Email error: ${error.message}`);
  }
};

export const sendTeamCompletionEmail = async (email, teamName) => {
  try {
    const resend = getResendClient();
    const html = `
      <p>Great news! All members of team <strong>${teamName}</strong> have verified their invitations.</p>
      <p><a href="https://chat.whatsapp.com/KodeKurrentGroupPlaceholder">Join WhatsApp</a></p>
      <p><a href="https://discord.gg/KodeKurrentServerPlaceholder">Join Discord</a></p>
    `;

    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: email,
      subject: `KodeKurrent 2.0 - Team ${teamName} Verified & Complete!`,
      html
    });
    
    if (error) throw new Error(error.message);

    return { success: true, messageId: data?.id };
  } catch (error) {
    throw new Error(`Email error: ${error.message}`);
  }
};

export const testEmailConnection = async () => {
  try {
    const resend = getResendClient();
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not defined");
    }
    console.log('✅ Resend is configured correctly.');
    return { success: true };
  } catch (error) {
    console.error('❌ Resend configuration test failed:', error.message);
    return { success: false, error: error.message };
  }
};
