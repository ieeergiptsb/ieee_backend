# SendGrid Setup for Render

## Quick Setup Steps

### 1. Create SendGrid Account

1. Go to [sendgrid.com](https://sendgrid.com)
2. Sign up for free account (100 emails/day free)
3. Verify your email address

### 2. Create API Key

1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it: `IEEE Backend`
4. Select **Full Access** (or just **Mail Send** permissions)
5. **Copy the API key** (starts with `SG.` - you can only see it once!)

### 3. Verify Sender Email

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Enter: `ieee_sb@rgipt.ac.in`
4. Fill in the form and verify via email

### 4. Update Render Environment Variables

Go to **Render Dashboard** → Your Service → **Environment** tab:

**Add/Update these variables:**
```
SENDGRID_API_KEY=SG.your-api-key-here
EMAIL_FROM=ieee_sb@rgipt.ac.in
```

**You can remove these (not needed with SendGrid):**
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`

### 5. Install Package

The code already includes SendGrid support. Just make sure the package is installed:

```bash
npm install @sendgrid/mail
```

Or it will be installed automatically when you deploy to Render.

## How It Works

- **SendGrid is PRIMARY** - Used if `SENDGRID_API_KEY` is set
- **SMTP is FALLBACK** - Used only if SendGrid fails or is not configured
- **No timeouts** - SendGrid API is much faster and more reliable than SMTP

## Testing

After deploying, check logs for:
```
🔍 SendGrid configured: true
✅ SendGrid initialized successfully
📧 Sending OTP email via SendGrid to: [email]
✅ Email sent successfully via SendGrid
```

## Troubleshooting

### "SendGrid configured: false"
- Check `SENDGRID_API_KEY` is set in Render
- Verify API key starts with `SG.`
- No spaces or quotes around the value

### "Unauthorized" error
- API key might be invalid
- Regenerate API key in SendGrid dashboard
- Update `SENDGRID_API_KEY` in Render

### "Sender not verified"
- Verify sender email in SendGrid dashboard
- Go to Settings → Sender Authentication
- Complete verification process

## Benefits of SendGrid

✅ **No timeout issues** - API-based, not SMTP  
✅ **Faster delivery** - Optimized for cloud platforms  
✅ **Better reliability** - Built for production use  
✅ **Free tier** - 100 emails/day (plenty for testing)  
✅ **Better deliverability** - Less likely to go to spam  

