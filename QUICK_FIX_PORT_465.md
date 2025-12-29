# Quick Fix: Switch to Port 465 (SSL)

## Step 1: Update Render Environment Variables

1. Go to **Render Dashboard** → Your Backend Service
2. Click **Environment** tab
3. Find `EMAIL_PORT` variable
4. Change value from `587` to `465`
5. Click **Save Changes**

**That's it!** The code automatically detects port 465 and uses SSL.

## Step 2: Verify

After Render redeploys, check logs for:
```
📧 Nodemailer SMTP Config: { host: 'smtp.gmail.com', port: 465, secure: true, ... }
```

## Why Port 465?

- **Port 587**: Uses STARTTLS (can timeout on some networks)
- **Port 465**: Uses SSL directly (more reliable on cloud platforms)

Both work, but 465 is often more reliable on Render.

