variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "availability_zones" {
  type = list(string)
}

variable "backend_image" {
  type = string
}

variable "dashboard_image" {
  type = string
}

variable "backend_port" {
  type    = number
  default = 8000
}

variable "dashboard_port" {
  type    = number
  default = 3000
}

variable "backend_cpu" {
  type    = number
  default = 256
}

variable "backend_memory" {
  type    = number
  default = 512
}

variable "dashboard_cpu" {
  type    = number
  default = 256
}

variable "dashboard_memory" {
  type    = number
  default = 512
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "public_api_base_url" {
  type = string
}

variable "public_dashboard_url" {
  type = string
}

variable "database_url" {
  type      = string
  sensitive = true
}

variable "redis_url" {
  type      = string
  sensitive = true
}

variable "s3_bucket_clinical" {
  type = string
}

variable "s3_bucket_audio" {
  type = string
}

variable "enable_docs" {
  type    = bool
  default = false
}

variable "allowed_origins" {
  type = list(string)
}
