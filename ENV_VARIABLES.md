# Environment Variables Configuration

## Required SendGrid Variables

### 1. SENDGRID_API_KEY (Required)
Your SendGrid API key. Must start with `SG.`

**Example:**
```env
SENDGRID_API_KEY=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
```

**How to get it:**
1. Go to https://app.sendgrid.com/settings/api_keys
2. Click "Create API Key"
3. Select "Full Access" or "Mail Send" permission
4. Copy the key (shown only once)

---

### 2. EMAIL_FROM (Optional)
Sender email address. Must be verified in SendGrid.

**Default:** `ieee_sb@rgipt.ac.in`

**Example:**
```env
EMAIL_FROM=ieee_sb@rgipt.ac.in
```

**How to verify:**
1. Go to https://app.sendgrid.com/settings/sender_auth
2. Click "Verify a Single Sender"
3. Follow verification steps

---

### 3. FRONTEND_URL (Optional)
Frontend URL for password reset links.

**Default:** `http://localhost:3000`

**Example:**
```env
FRONTEND_URL=https://yourdomain.com
```

---

## Complete .env File Example

```env
# SendGrid Configuration
SENDGRID_API_KEY=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
EMAIL_FROM=ieee_sb@rgipt.ac.in
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/ieee_rgipt

# JWT
JWT_SECRET=your_jwt_secret_here

# Server
PORT=8000
NODE_ENV=development
```

---

## Removed SMTP Variables

The following variables are **no longer needed** and should be removed:
- ❌ `EMAIL_HOST`
- ❌ `EMAIL_PORT`
- ❌ `EMAIL_USER`
- ❌ `EMAIL_PASS`

---

## Quick Setup

1. Add `SENDGRID_API_KEY` to your `.env` file
2. Verify `EMAIL_FROM` email in SendGrid Dashboard
3. Restart your server
4. Test by registering a new user

For detailed setup instructions, see `SENDGRID_SETUP.md`
