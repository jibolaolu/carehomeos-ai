terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "carehomeos" {
  source = "../../modules/carehomeos_service"

  project_name         = var.project_name
  environment          = var.environment
  aws_region           = var.aws_region
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  backend_image        = var.backend_image
  dashboard_image      = var.dashboard_image
  public_api_base_url  = var.public_api_base_url
  public_dashboard_url = var.public_dashboard_url
  database_url         = var.database_url
  redis_url            = var.redis_url
  s3_bucket_clinical   = var.s3_bucket_clinical
  s3_bucket_audio      = var.s3_bucket_audio
  enable_docs          = var.enable_docs
  allowed_origins      = var.allowed_origins
}
