# Auth0 Setup Guide for CareHomeOS

This guide walks you through creating the Auth0 Management API application and running the setup script to configure your Auth0 tenant for CareHomeOS.

## Prerequisites

- An Auth0 account at https://auth0.com
- A tenant created (e.g., `dev-careorchestrator.uk.auth0.com`)
- The CareHomeOS dashboard app already created in Auth0 (with `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`)

## Step 1: Create a Machine-to-Machine (M2M) Application

The setup script needs a Management API token to create resources in your Auth0 tenant.

1. Go to https://manage.auth0.com
2. Navigate to **Applications > Applications**
3. Click **Create Application**
4. Name it: `CareHomeOS Management`
5. Select **Machine to Machine Applications**
6. Click **Create**

## Step 2: Authorize the M2M App for the Management API

After creating the app, you'll be prompted to select an API:

1. Select **Auth0 Management API**
2. Check ALL of the following scopes (required by the setup script):

   ```
   read:resource_servers
   create:resource_servers
   update:resource_servers
   read:clients
   create:clients
   update:clients
   read:client_grants
   create:client_grants
   update:client_grants
   read:roles
   create:roles
   read:users
   create:users
   update:users
   update:users_app_metadata
   read:actions
   create:actions
   update:actions
   read:action_triggers
   update:action_triggers
   ```

3. Click **Authorize**

## Step 3: Get the M2M Credentials

1. In your new `CareHomeOS Management` app, go to the **Settings** tab
2. Copy the **Client ID** — this is your `AUTH0_MANAGEMENT_CLIENT_ID`
3. Copy the **Client Secret** — this is your `AUTH0_MANAGEMENT_CLIENT_SECRET`

## Step 4: Update Environment Variables

Add the credentials to both `.env` files:

### Root `.env`
```bash
# Add these lines (fill in your values)
AUTH0_MANAGEMENT_CLIENT_ID=YOUR_M2M_CLIENT_ID_HERE
AUTH0_MANAGEMENT_CLIENT_SECRET=YOUR_M2M_CLIENT_SECRET_HERE
```

### Dashboard `.env.local`
```bash
# Add these lines (fill in your values)
AUTH0_MANAGEMENT_CLIENT_ID=YOUR_M2M_CLIENT_ID_HERE
AUTH0_MANAGEMENT_CLIENT_SECRET=YOUR_M2M_CLIENT_SECRET_HERE
```

## Step 5: Run the Setup Script

```bash
cd carehomeos
node scripts/setup-auth0.js
```

This script will:
- Create the CareHomeOS API resource server
- Update the dashboard app settings (callback URLs, logout URLs)
- Create roles: `super_admin`, `care_home_admin`, `sub_admin`, `staff`
- Create a Post Login Action (injects role claims into tokens)
- Create demo users with passwords
- Set up client grants

## Step 6: Verify the Dashboard App Callback URLs

After running the script, verify the dashboard app has the correct callback URL:

1. Go to https://manage.auth0.com > Applications > Your Dashboard App
2. Check **Allowed Callback URLs** includes:
   ```
   https://carehomeos.localtest.me/api/auth/callback
   ```
3. Check **Allowed Logout URLs** includes:
   ```
   https://carehomeos.localtest.me
   https://carehomeos.localtest.me/
   https://carehomeos.localtest.me/login
   ```
4. Check **Allowed Web Origins** includes:
   ```
   https://carehomeos.localtest.me
   ```

## Step 7: Test Auth0 Login

1. Restart the CareHomeOS dev server:
   ```bash
   ./run-local.sh
   ```

2. Open https://carehomeos.localtest.me
3. Click **"Sign in with CareHomeOS"**
4. You should be redirected to the Auth0 login page
5. Log in with one of the demo accounts created by the script

## Demo Users Created by the Script

The setup script creates these demo users in Auth0:

| Email | Role | Password |
|-------|------|----------|
| `superadmin@carehomeos.local` | super_admin | `CareHomeOS!2026` |
| `manager@oakfield.local` | care_home_admin | `CareHomeOS!2026` |
| `deputy@oakfield.local` | sub_admin | `CareHomeOS!2026` |
| `staff@oakfield.local` | staff | `CareHomeOS!2026` |

## Troubleshooting

### "Auth0 not configured" error
- Check that `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET` are set in `dashboard/.env.local`
- Restart the dev server after adding env vars

### "invalid_grant" error
- The callback URL in Auth0 doesn't match exactly
- Must be: `https://carehomeos.localtest.me/api/auth/callback`
- Check in Auth0 Dashboard > Applications > Your App > Allowed Callback URLs

### "token-exchange-failed" error
- The `AUTH0_CLIENT_SECRET` might be incorrect
- Verify the secret matches what's in Auth0 Dashboard

### "Insufficient scope" or "Management API not authorized" error

The M2M app doesn't have all the required scopes. The setup script needs these scopes:

```
read:resource_servers, create:resource_servers, update:resource_servers
read:clients, create:clients, update:clients
read:client_grants, create:client_grants, update:client_grants
read:roles, create:roles
read:users, create:users, update:users, update:users_app_metadata
read:actions, create:actions, update:actions
read:action_triggers, update:action_triggers
```

**To add missing scopes:**
1. Go to Auth0 Dashboard > Applications > APIs > Auth0 Management API
2. Click the **Machine to Machine Applications** tab
3. Find your `CareHomeOS Management` app
4. Click the **down arrow** to expand it
5. Check all the scopes listed above
6. Click **Update**
7. Re-run: `node scripts/setup-auth0.js`

### Users don't have roles
- The Post Login Action might not be deployed
- Go to Auth0 Dashboard > Actions > Library
- Find "CareHomeOS Post Login" and make sure it's deployed
- Go to Auth0 Dashboard > Actions > Triggers > Post Login
- Make sure the action is attached to the login flow
