# Remove Secrets from Git History

## Problem
GitHub is blocking pushes because the SendGrid API key is in commit history (commits 8362e21 and ec5a1a4).

## Solution: Use BFG Repo-Cleaner or git filter-branch

### Option 1: Use GitHub's Secret Unblock (Quick but not secure)

1. Go to: https://github.com/ieeergiptsb/ieee_backend/security/secret-scanning/unblock-secret/37U5oQNajJ9qbGgdTCF6L2K6Q4W
2. Click "Allow secret" (temporary)
3. Push your code
4. **⚠️ Then immediately rotate your SendGrid API key** in SendGrid dashboard

### Option 2: Rewrite History (Recommended)

Since the secrets are in old commits, you need to rewrite history:

```bash
# Install BFG Repo-Cleaner (easier) or use git filter-branch

# Using git filter-branch:
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch RENDER_ENV_COPY_PASTE.txt RENDER_ENV_VARIABLES.md SENDGRID_SETUP.md SENDGRID_EMAIL_VERIFICATION.md" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (this rewrites history)
git push --force origin main
```

### Option 3: Start Fresh Branch (Easiest)

1. Create a new branch from before the secrets were added:
```bash
git checkout df7194d
git checkout -b main-clean
```

2. Cherry-pick only the commits you need (without secrets):
```bash
# Cherry-pick commits that don't have secrets
git cherry-pick 389a1cc  # Delete FIX_CORS_WWW.md
git cherry-pick 4879c2d  # Your latest commit without secrets
```

3. Delete old main and rename:
```bash
git branch -D main
git branch -m main
git push --force origin main
```

## Recommended: Option 1 (Quick Fix) + Rotate Key

1. Use GitHub's unblock feature to push now
2. Immediately rotate your SendGrid API key
3. Update the key in Render environment variables
4. This way the old key in history becomes invalid

## After Fixing

✅ Add environment variables directly in Render Dashboard
✅ Never commit secrets to git
✅ Use template files for documentation

