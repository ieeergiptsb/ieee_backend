# SendGrid Email Setup Guide

This project uses **SendGrid** exclusively for sending emails. SMTP is no longer supported.

## Required Environment Variables

### 1. `SENDGRID_API_KEY` (Required)
- **Description**: Your SendGrid API key
- **Format**: Must start with `SG.`
- **How to get it**:
  1. Go to [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)
  2. Click "Create API Key"
  3. Name it (e.g., "IEEE Website Production")
  4. Select "Full Access" or at least "Mail Send" permission
  5. Copy the API key (you'll only see it once!)
  6. Add it to your `.env` file

**Example:**
```env
SENDGRID_API_KEY=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
```

### 2. `EMAIL_FROM` (Optional)
- **Description**: The email address that will appear as the sender
- **Default**: `ieee_sb@rgipt.ac.in`
- **Important**: This email **must be verified** in SendGrid Dashboard
- **How to verify**:
  1. Go to [SendGrid Dashboard](https://app.sendgrid.com/settings/sender_auth)
  2. Click "Verify a Single Sender" or set up Domain Authentication
  3. Follow the verification steps

**Example:**
```env
EMAIL_FROM=ieee_sb@rgipt.ac.in
```

### 3. `FRONTEND_URL` (Optional)
- **Description**: Your frontend URL (used for password reset links)
- **Default**: `http://localhost:3000`
- **Production Example**: `https://yourdomain.com`

**Example:**
```env
FRONTEND_URL=https://ieee-rgipt.vercel.app
```

## Setup Steps

1. **Create a SendGrid Account** (if you don't have one)
   - Go to [SendGrid](https://sendgrid.com/)
   - Sign up for a free account (100 emails/day free)

2. **Create an API Key**
   - Follow the steps above for `SENDGRID_API_KEY`

3. **Verify Sender Email**
   - Follow the steps above for `EMAIL_FROM`

4. **Add to Environment Variables**
   - Local: Add to `backend/.env` file
   - Production (Render): Add to Environment Variables in Render Dashboard
   - Production (Vercel): Add to Environment Variables in Vercel Dashboard

5. **Test the Configuration**
   - Start your backend server
   - Try registering a new user
   - Check your email (and spam folder!)

## Troubleshooting

### Error: 401 Unauthorized
- **Cause**: Invalid API key or missing "Mail Send" permission
- **Solution**: 
  - Verify your API key is correct
  - Check that the API key has "Mail Send" permissions enabled
  - Make sure the API key starts with `SG.`

### Error: Sender email not verified
- **Cause**: The email in `EMAIL_FROM` is not verified in SendGrid
- **Solution**: Verify the sender email in SendGrid Dashboard → Settings → Sender Authentication

### Emails going to spam
- **Solution**: Set up Domain Authentication in SendGrid (recommended for production)

## Removed SMTP Variables

The following SMTP variables are **no longer used** and can be removed:
- ❌ `EMAIL_HOST`
- ❌ `EMAIL_PORT`
- ❌ `EMAIL_USER`
- ❌ `EMAIL_PASS`

## Support

For SendGrid issues, check:
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [SendGrid Status Page](https://status.sendgrid.com/)
