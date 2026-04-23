# CareHomeOS Local Professional Testing Checklist

Use this checklist to run CareHomeOS locally in the same style as CareOrchestrator, with local demo users first and Auth0-ready configuration next.

## Local URLs

- Dashboard: `http://localhost:3105`
- API: `http://localhost:8105`
- API docs: `http://localhost:8105/docs`
- Staff mobile web: `http://localhost:19015`
- Family app web: `http://localhost:19016`
- Proxy dashboard: `https://carehomeos.localtest.me`
- Proxy API: `https://carehomeos-api.localtest.me`

## Demo Users

All local demo users use password `CareHomeOS!2026`.

- Platform super admin: `superadmin@carehomeos.local`
- Care home superuser/admin: `manager@oakfield.local`
- Sub admin/assistant manager: `deputy@oakfield.local`
- Staff reporting user: `staff@oakfield.local`

## Auth0 Setup

Create these Auth0 applications and API resources:

- Regular Web Application: `CareHomeOS Dashboard`
- Native Application: `CareHomeOS Staff Mobile`
- Native or SPA Application: `CareHomeOS Family App`
- API audience: `https://carehomeos-api.localtest.me`

Dashboard callback and logout URLs:

- `http://localhost:3105/api/auth/callback`
- `https://carehomeos.localtest.me/api/auth/callback`
- `http://localhost:3105`
- `https://carehomeos.localtest.me`

Allowed web origins:

- `http://localhost:3105`
- `https://carehomeos.localtest.me`

Add custom claims or `app_metadata` for:

- `role`: `super_admin`, `care_home_admin`, `sub_admin`, or `staff`
- `care_home_id`: for scoped care-home users
- `admin_level`: `registered_manager`, `assistant_manager`, or another internal level

Add these values to `.env`:

- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_BASE_URL` optional. Leave blank locally so Auth0 uses the same browser URL you opened.

## AI and Translation Keys

The backend now exposes:

- `GET /api/v1/ai/status`
- `POST /api/v1/ai/complete`

Configure whichever providers you have:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY` optional
- `DEEPL_API_KEY` for multilingual voice-note translation

Model names are configurable:

- `ANTHROPIC_MODEL`
- `ANTHROPIC_DEEP_MODEL`
- `OPENAI_MODEL`
- `OPENAI_FAST_MODEL`
- `GEMINI_MODEL`

If no paid AI keys are present, CareHomeOS returns a deterministic local fallback so end-to-end tests still run.

## Billing, Email, and Storage

For subscription testing:

- Add `STRIPE_SECRET_KEY`.
- Mirror the Starter, Professional, and Enterprise products in Stripe.
- Map Stripe price IDs into the billing service before real checkout.

For notifications:

- Use MailHog locally on `http://localhost:8026`.
- Add `SENDGRID_API_KEY` when testing real email delivery.

For files and audio:

- Use MinIO locally on ports `9010` and `9011`.
- Keep `S3_BUCKET_CLINICAL` and `S3_BUCKET_AUDIO` set.

## Local Run Order

1. Start Docker infrastructure.
2. Run `./run-local.sh` from WSL or `.\start-local.ps1` from PowerShell.
3. Start the nginx HTTPS proxy after the services are already listening:
   `cd /mnt/c/Users/EAGLESOLUTIONS/Documents/localproxy && ./setup_local_https_proxy.sh`.
4. Open `http://localhost:3105` or `https://carehomeos.localtest.me`.
5. Choose a role on the landing page and run the end-to-end scenario.
