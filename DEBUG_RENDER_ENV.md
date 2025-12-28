# Debug Render Environment Variables

## Issue: SendGrid not being detected on Render

If you're seeing "⚠️ SendGrid API key not found" even after adding variables:

### Step 1: Verify Variables in Render

1. Go to Render Dashboard → Your Service → **Environment** tab
2. **Check these exact variable names** (case-sensitive):
   - `SENDGRID_API_KEY` (not `sendgrid_api_key` or `SENDGRID-API-KEY`)
   - `EMAIL_FROM` (not `email_from` or `EMAIL-FROM`)

3. **Check for extra spaces**:
   - Value should be: `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`
   - No spaces before or after
   - No quotes around the value

### Step 2: Manual Redeploy

After adding/changing variables:
1. Go to **Events** tab in Render
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for deployment to complete
4. Check logs for: `✅ SendGrid configured`

### Step 3: Check Deployment Logs

Look for these log messages:
- `🔍 Checking SendGrid configuration...`
- `🔍 SENDGRID_API_KEY exists: true/false`
- `✅ SendGrid configured successfully` (should see this)

### Step 4: Verify Variable Format

In Render, the variable should look like:
```
Key: SENDGRID_API_KEY
Value: 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
```

**Common mistakes:**
- ❌ Extra spaces: ` SG.TZSttb1FQYS0rAXy_9w7sw... ` (with spaces)
- ❌ Quotes: `"SG.TZSttb1FQYS0rAXy_9w7sw..."`
- ❌ Wrong case: `sendgrid_api_key` instead of `SENDGRID_API_KEY`

### Step 5: Test After Redeploy

1. After redeploy, try registering a new user
2. Check logs for:
   - `🔍 Checking SendGrid configuration...`
   - `✅ SendGrid configured successfully`
   - `📧 Attempting to send email via: SendGrid`

If you still see "SMTP" instead of "SendGrid", the variable is not being read correctly.

### Step 6: Alternative - Use Bulk Edit

1. In Render Environment tab, click **"Bulk Edit"**
2. Paste this (replace existing if needed):
```
SENDGRID_API_KEY=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
EMAIL_FROM=ieeesbrgipt@gmail.com
```
3. Click **"Save Changes"**
4. Wait for auto-redeploy

### Still Not Working?

1. **Check Render Logs** for any errors during startup
2. **Verify the variable is actually saved** - refresh the Environment page
3. **Try deleting and re-adding** the variable
4. **Check if Render service is using the correct branch** (should be `main`)

