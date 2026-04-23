# Deployment Runbook

1. Build backend and dashboard images.
2. Run backend tests.
3. Apply Terraform for the selected environment.
4. Deploy API, dashboard, workers, and scheduled tasks.
5. Verify `/health`, `/ready`, `/api/v1/meta`, and dashboard routes.
