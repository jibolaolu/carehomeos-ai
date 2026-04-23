# CareHomeOS Terraform

This directory contains the Terraform baseline for deploying CareHomeOS to AWS with separate `dev`, `staging`, and `prod` environment configurations.

## Structure

- `modules/carehomeos_service/` reusable AWS module for VPC, ALB, ECR, ECS, and logging
- `environments/dev/` development configuration
- `environments/staging/` staging configuration
- `environments/prod/` production configuration

## Deployment flow

1. Build and push the backend and dashboard container images to ECR.
2. Copy the relevant `terraform.tfvars.example` to `terraform.tfvars`.
3. Set image URIs, database URLs, Redis URLs, and public URLs for the target environment.
4. Run `terraform init` and `terraform apply` inside the target environment directory.

## Notes

- The current module is intentionally a baseline and expects managed database and Redis endpoints to be supplied.
- For production, keep `enable_docs = false`.
- Store secrets outside source control and inject them via secure CI/CD or secrets management.
