# Complete Email Setup Guide for Render

## Option 1: Gmail with Port 465 (SSL) - RECOMMENDED

### Step 1: Update Render Environment Variables

Go to **Render Dashboard** → Your Service → **Environment** tab and update:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=ieee_sb@rgipt.ac.in
EMAIL_PASS=sqzekxxjhniiiegi
EMAIL_FROM=ieee_sb@rgipt.ac.in
```

**Key Change:** `EMAIL_PORT=465` (instead of 587)

### Step 2: Deploy Code

The code automatically detects port 465 and uses SSL. Just deploy the latest code.

### Step 3: Verify Gmail Settings

1. **Check App Password**:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Navigate to: **2-Step Verification** → **App passwords**
   - Verify your app password is still active
   - If needed, generate a new one

2. **Verify Account Status**:
   - Check that your Gmail account is not locked
   - Ensure 2-Step Verification is enabled
   - Check for any security alerts in your Google Account

3. **Test Connection**:
   - After deploying, try registering a new user
   - Check Render logs for email sending status

---

## Option 2: Use Dedicated Email Service (MOST RELIABLE)

If Gmail continues to timeout, use a dedicated email service. Here are the best options:

### A. SendGrid (Recommended - Free Tier: 100 emails/day)

#### Setup Steps:

1. **Create SendGrid Account**:
   - Go to [sendgrid.com](https://sendgrid.com)
   - Sign up for free account
   - Verify your email

2. **Create API Key**:
   - Go to **Settings** → **API Keys**
   - Click **Create API Key**
   - Name it "IEEE Backend"
   - Give it **Full Access** or **Mail Send** permissions
   - Copy the API key (starts with `SG.`)

3. **Verify Sender Email**:
   - Go to **Settings** → **Sender Authentication**
   - Verify your sender email (`ieee_sb@rgipt.ac.in`)

4. **Update Render Environment Variables**:
   ```
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=SG.your-api-key-here
   EMAIL_FROM=ieee_sb@rgipt.ac.in
   ```

5. **Update Code**:
   - Install: `npm install @sendgrid/mail`
   - Update `backend/src/utils/email.js` to use SendGrid

#### SendGrid Code Example:
```javascript
import sgMail from '@sendgrid/mail';

if (process.env.EMAIL_SERVICE === 'sendgrid') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // Use SendGrid API
}
```

### B. Mailgun (Free Tier: 5,000 emails/month)

#### Setup Steps:

1. **Create Mailgun Account**:
   - Go to [mailgun.com](https://www.mailgun.com)
   - Sign up for free account
   - Verify your domain or use sandbox domain

2. **Get API Credentials**:
   - Go to **Sending** → **Domain Settings**
   - Copy your **API Key** and **SMTP credentials**

3. **Update Render Environment Variables**:
   ```
   EMAIL_HOST=smtp.mailgun.org
   EMAIL_PORT=587
   EMAIL_USER=postmaster@your-domain.mailgun.org
   EMAIL_PASS=your-mailgun-api-key
   EMAIL_FROM=ieee_sb@rgipt.ac.in
   ```

### C. Amazon SES (Very Cheap - Pay per email)

#### Setup Steps:

1. **Create AWS Account**:
   - Go to [aws.amazon.com](https://aws.amazon.com)
   - Sign up for AWS account

2. **Set up SES**:
   - Go to **Amazon SES** console
   - Verify your email address
   - Move out of sandbox mode (request production access)

3. **Get SMTP Credentials**:
   - Go to **SMTP Settings**
   - Create SMTP credentials
   - Copy SMTP server, port, username, and password

4. **Update Render Environment Variables**:
   ```
   EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
   EMAIL_PORT=587
   EMAIL_USER=your-ses-smtp-username
   EMAIL_PASS=your-ses-smtp-password
   EMAIL_FROM=ieee_sb@rgipt.ac.in
   ```

---

## Option 3: Verify Current Gmail Setup

### Checklist:

- [ ] **App Password is Valid**:
  - Go to [Google Account App Passwords](https://myaccount.google.com/apppasswords)
  - Check that your app password exists
  - If expired, generate a new one

- [ ] **2-Step Verification Enabled**:
  - Go to [Google Account Security](https://myaccount.google.com/security)
  - Ensure **2-Step Verification** is ON
  - App passwords require 2-Step Verification

- [ ] **Account Not Locked**:
  - Check for security alerts in Gmail
  - Ensure account is active and not suspended
  - Check spam folder for security notifications

- [ ] **Correct Environment Variables**:
  - `EMAIL_USER` = `ieee_sb@rgipt.ac.in`
  - `EMAIL_PASS` = `sqzekxxjhniiiegi` (no spaces)
  - `EMAIL_PORT` = `465` (for SSL) or `587` (for TLS)

---

## Testing After Changes

1. **Deploy to Render**
2. **Check Logs** for:
   ```
   📧 Nodemailer SMTP Config: { host: 'smtp.gmail.com', port: 465, secure: true, ... }
   ✅ Nodemailer transporter created and verified successfully
   ```

3. **Test Registration**:
   - Try registering a new user
   - Check if OTP email is received
   - Monitor Render logs for any errors

---

## Troubleshooting

### Still Getting Timeouts?

1. **Try Port 465** (if using 587)
2. **Switch to SendGrid** (most reliable for cloud)
3. **Check Render Network** - Contact Render support
4. **Verify Firewall** - Gmail might be blocking Render IPs

### Authentication Errors?

1. **Regenerate App Password**
2. **Verify 2-Step Verification is ON**
3. **Check email/password for typos**
4. **Remove spaces from app password**

### Need Help?

- Check Render logs for specific error messages
- Test email credentials locally first
- Consider using a dedicated email service for production

