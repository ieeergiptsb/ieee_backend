# Fix SMTP Timeout on Render

## Changes Applied

1. **Increased Timeouts**: 30s → 60s for all SMTP operations
2. **Disabled Connection Pooling**: Can cause issues on Render
3. **Added Retry Logic**: Automatically retries up to 2 times with exponential backoff
4. **Fresh Transporter on Retry**: Creates new connection if first attempt fails

## Current Configuration

- Connection Timeout: 60 seconds
- Socket Timeout: 60 seconds  
- Greeting Timeout: 30 seconds
- Email Send Timeout: 60 seconds
- Retry Attempts: 2 (with 2s and 4s delays)

## If Still Timing Out

### Option 1: Try Port 465 (SSL)

If port 587 continues to timeout, try using SSL on port 465:

**Update in Render Environment Variables:**
```
EMAIL_PORT=465
```

**Then update code** (contact developer or update `backend/src/utils/email.js`):
Change `secure: false` to `secure: true` on line 33

### Option 2: Use Different SMTP Service

Consider using a dedicated email service:
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 5,000 emails/month)
- **Amazon SES** (very cheap, pay per email)

### Option 3: Check Gmail Account Settings

1. **Check "Less secure app access"** - Should be OFF (using App Password instead)
2. **Verify App Password** is still valid
3. **Check Gmail account** isn't locked or restricted
4. **Try from different Gmail account** to test if it's account-specific

### Option 4: Network/Firewall Issues

Render's network might be blocking Gmail SMTP. Check:
- Render service logs for network errors
- Try from local machine to verify credentials work
- Contact Render support if issue persists

## Testing

After deploying, check logs for:
```
📧 Attempt 1/2 to send email...
✅ Email sent successfully via nodemailer: [messageId]
```

If you see retries:
```
⚠️ Attempt 1 failed: SMTP timeout
⏳ Waiting 2000ms before retry...
📧 Attempt 2/2 to send email...
```

## Expected Behavior

- First attempt may timeout (Render network can be slow)
- Automatic retry with fresh connection
- Should succeed on 2nd attempt if network is just slow
- If both fail, check credentials and network connectivity

