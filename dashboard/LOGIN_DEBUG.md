# Login Debugging Guide

## Recent Fixes Applied

### 1. Auth0 Configuration Added to Dashboard
**Problem**: Auth0 credentials were only in `carehomeos/.env`, but Next.js only loads `.env` files from the project root (`dashboard/`). The dashboard couldn't access Auth0 config.

**Fix**: Added Auth0 credentials to `dashboard/.env.local`.

### 2. Role Normalization Fixed
**Problem**: `normalizeRole()` in `lib/rbac.ts` forced ALL `@carehomeos.local` emails to `super_admin` role, regardless of their actual role. This meant:
- `manager@oakfield.local` (care_home_admin) → forced to super_admin
- `deputy@oakfield.local` (sub_admin) → forced to super_admin  
- `staff@oakfield.local` (staff) → forced to super_admin

Since `super_admin` can only access `/platform-admin`, `/plans`, `/admin`, etc. (NOT `/dashboard`), users were redirected to wrong pages.

**Fix**: Changed the check from `email.endsWith("@carehomeos.local")` to `email === "superadmin@carehomeos.local"`.

### 3. Debug Logging Added
Added console logging to:
- `app/api/auth/login/route.ts` - Shows Auth0 config and redirect URL
- `app/api/auth/callback/route.ts` - Shows token exchange and session creation
- `middleware.ts` - Shows cookie validation and role checks

## How to Test

1. **Restart the dashboard dev server** (to pick up new `.env.local`):
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart:
   ./run-local.sh
   ```

2. **Open browser dev tools** (F12) and go to Console tab

3. **Try local login** (quick-login chips):
   - Click "Care home admin" (manager@oakfield.local)
   - Should redirect to `/dashboard`
   - Check console for `[local-callback]` logs

4. **Try Auth0 login**:
   - Click "Sign in with CareHomeOS"
   - Should redirect to Auth0 login page
   - After login, should redirect back to dashboard
   - Check console for `[auth/callback]` logs

## Common Issues

### "Auth0 is not configured"
- Check `/api/auth/status` in browser Network tab
- Should show `auth0Configured: true`
- If false, restart the dev server

### "invalid_grant" or "token-exchange-failed"
- The Auth0 app callback URL doesn't match
- Must be exactly: `https://carehomeos.localtest.me/api/auth/callback`
- Check in Auth0 Dashboard > Applications > Your App > Allowed Callback URLs

### Redirected to wrong page
- Check `[middleware]` logs in server console
- Shows: pathname, cookie present, session valid, role, path allowed

### "callback-network-error"
- Can't reach Auth0 servers
- Check internet connection
- Check if `AUTH0_DOMAIN` is correct
