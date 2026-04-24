
# CareHomeOS

CareHomeOS is a monorepo for an AI-powered care home management platform covering clinical workflows, compliance, family communications, and operational tooling.

## Included structure

- `backend/` FastAPI backend, deterministic AI fallbacks, and background tasks
- `dashboard/` Next.js dashboard for residents, eMAR, rota, incidents, finance, and CQC readiness
- `mobile/` React Native / Expo screens and services for staff workflows
- `family-app/` family-facing React Native screens
- `infrastructure/` Terraform module and deployment stack configuration
- `docs/` compliance, safety, and operational runbooks

## Current local run status

- `backend/` is locally runnable and containerized for deployment
- `docker-compose.yml` is wired for local PostgreSQL, Redis, MinIO, and MailHog with service health checks
- `dashboard/` is runnable as a local Next.js operational dashboard and containerized for deployment
- `mobile/` and `family-app/` now use the same Expo SDK 54 runtime pattern as the working healthcare mobile app, with package files, app config, Metro/Babel config, assets, auth state, navigation, and notification guards

## Deployment readiness

- `backend/Dockerfile` builds the API service container
- `dashboard/Dockerfile` builds the dashboard container
- `infrastructure/terraform/modules/carehomeos_service/` provides a reusable AWS baseline module
- `infrastructure/terraform/environments/` contains `dev`, `staging`, and `prod` configuration entry points

## Local development approach

Recommended local setup:

1. Start local dependencies with Docker Compose
2. Copy `.env.example` to `.env` if you want to override local defaults
3. Run the FastAPI backend locally with `uvicorn`
4. Install dashboard dependencies and run the local dashboard
5. Install and run either Expo app when testing staff or family workflows

## Quick start

### 1. Start infrastructure

```bash
docker compose up -d
```

### 2. Create environment file

```bash
copy .env.example .env
```

If you skip this step, the backend will still start by falling back to `.env.example` values.

### 3. Create Python environment

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Run API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8105
```

### 5. Install and run dashboard

```bash
npm install --prefix dashboard
npm run dev --prefix dashboard -- -p 3105
```

### 6. Install and run staff mobile app

```bash
npm install --prefix mobile
npm run start --prefix mobile
```

For web preview:

```bash
npm run web --prefix mobile
```

PowerShell shortcut for the staff mobile app:

```powershell
.\start-mobile.ps1
```

Install dependencies and start the web preview:

```powershell
.\start-mobile.ps1 -Install -Target web -Port 19015
```

Other targets:

```powershell
.\start-mobile.ps1 -Target android
.\start-mobile.ps1 -Target ios
.\start-mobile.ps1 -Target start
```

### 7. Install and run family app

```bash
npm install --prefix family-app
npm run start --prefix family-app
```

For web preview:

```bash
npm run web --prefix family-app
```

### 8. Verify health

Open `http://localhost:8105/health`

Open `http://localhost:8105/ready`

Open `http://localhost:8105/api/v1/meta`

Open `http://localhost:3105`

When the shared HTTPS proxy is installed, use:

- `https://carehomeos.localtest.me`
- `https://carehomeos-api.localtest.me`

The HTTPS proxy is nginx-based and lives at:

```text
C:\Users\EAGLESOLUTIONS\Documents\localproxy\setup_local_https_proxy.sh
```

Run that script from WSL after the CareHomeOS dashboard and API are already listening.

### 9. Optional local startup script

```bash
./start-local.ps1 -StartInfrastructure -StartBackend -StartDashboard
```

## Container builds

### Backend image

```bash
docker build -t carehomeos-backend:local ./backend
```

### Dashboard image

```bash
docker build -t carehomeos-dashboard:local ./dashboard
```

## Terraform environments

Use one of the following environment folders:

- `infrastructure/terraform/environments/dev`
- `infrastructure/terraform/environments/staging`
- `infrastructure/terraform/environments/prod`

Typical flow:

1. Copy `terraform.tfvars.example` to `terraform.tfvars`
2. Replace image URIs and environment-specific URLs/secrets
3. Run `terraform init`
4. Run `terraform apply`

## Important notes

- Domain services, API routes, dashboard pages, mobile screens, task runners, tests, and runbooks now contain concrete implementation code.
- The backend boot path is implemented so local development can begin immediately.
- The dashboard has a styled operational runtime for local development.
- The mobile and family app folders include Expo package/runtime metadata for local web, iOS, Android, and EAS build workflows.
- AWS deployment is now structured around reusable Terraform modules with separate environment folders.
- API keys must be supplied through environment variables and never committed.
- For local S3-compatible storage, CareHomeOS uses MinIO.

## Suggested next build steps

- Define shared domain models and schema contracts first
- Add Alembic configuration and real SQLAlchemy models
- Connect mobile authentication to the production identity provider
- Add authentication, RBAC, and audit middleware incrementally
