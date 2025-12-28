# Fix CORS Error: www.ieeergipt.in vs ieeergipt.in

## Problem
Your frontend is at `https://www.ieeergipt.in` (with `www.`) but your backend CORS is set to `https://ieeergipt.in` (without `www.`). This causes CORS errors.

## Solution: Update Render Environment Variable

### Option 1: Update FRONTEND_URL in Render (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click your backend service
3. Go to **Environment** tab
4. Find `FRONTEND_URL`
5. Update it to: `https://www.ieeergipt.in`
6. **Save** and wait for redeploy

### Option 2: Allow Both Origins (Already Fixed in Code)

The backend code has been updated to allow both `www.ieeergipt.in` and `ieeergipt.in`. Just redeploy your backend.

## After Updating

1. **Redeploy Backend:**
   - Render will auto-redeploy after you save the environment variable
   - Or manually trigger a redeploy

2. **Test:**
   - Try to register/login again
   - Check browser console - CORS error should be gone

## Current Configuration

**Render Environment Variable:**
```
FRONTEND_URL=https://www.ieeergipt.in
```

**Or if you want to support both:**
The code now supports both with and without `www.` automatically.

## Quick Fix Steps

1. Render Dashboard → Your Backend Service
2. Environment tab
3. Update `FRONTEND_URL` to `https://www.ieeergipt.in`
4. Save
5. Wait for redeploy (1-2 minutes)
6. Test your frontend

## Verify Fix

After redeploy, check:
- Browser console should show no CORS errors
- Registration/login should work
- Network tab shows successful requests

