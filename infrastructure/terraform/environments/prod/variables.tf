variable "project_name" { type = string }
variable "environment" { type = string }
variable "aws_region" { type = string }
variable "vpc_cidr" { type = string }
variable "availability_zones" { type = list(string) }
variable "backend_image" { type = string }
variable "dashboard_image" { type = string }
variable "public_api_base_url" { type = string }
variable "public_dashboard_url" { type = string }
variable "database_url" { type = string, sensitive = true }
variable "redis_url" { type = string, sensitive = true }
variable "s3_bucket_clinical" { type = string }
variable "s3_bucket_audio" { type = string }
variable "enable_docs" { type = bool }
variable "allowed_origins" { type = list(string) }
