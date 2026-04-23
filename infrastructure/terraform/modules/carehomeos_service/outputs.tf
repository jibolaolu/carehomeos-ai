output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "backend_ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "dashboard_ecr_repository_url" {
  value = aws_ecr_repository.dashboard.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}
