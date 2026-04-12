output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "パブリックサブネット ID"
  value       = aws_subnet.public[*].id
}

output "ecs_cluster_name" {
  description = "ECS クラスタ名"
  value       = aws_ecs_cluster.main.name
}

output "ecr_repository_url" {
  description = "ECR リポジトリ URL"
  value       = aws_ecr_repository.app.repository_url
}

output "task_execution_role_arn" {
  description = "タスク実行ロール ARN"
  value       = aws_iam_role.task_execution.arn
}

output "task_role_arn" {
  description = "タスクロール ARN"
  value       = aws_iam_role.task.arn
}

output "log_group_name" {
  description = "CloudWatch Logs グループ名"
  value       = aws_cloudwatch_log_group.app.name
}

output "security_group_id" {
  description = "ECS セキュリティグループ ID"
  value       = aws_security_group.ecs.id
}

output "tfstate_bucket" {
  description = "tfstate S3 バケット名"
  value       = aws_s3_bucket.tfstate.id
}

output "server_ecr_repository_url" {
  description = "server ECR リポジトリ URL"
  value       = aws_ecr_repository.server.repository_url
}

output "server_log_group_name" {
  description = "server CloudWatch Logs グループ名"
  value       = aws_cloudwatch_log_group.server.name
}

output "private_subnet_ids" {
  description = "プライベートサブネット ID"
  value       = aws_subnet.private[*].id
}

output "rds_endpoint" {
  description = "RDS エンドポイント"
  value       = aws_db_instance.main.endpoint
}

output "cloudfront_distribution_id" {
  description = "CloudFront ディストリビューション ID"
  value       = aws_cloudfront_distribution.web.id
}

output "cloudfront_domain_name" {
  description = "CloudFront ドメイン名"
  value       = aws_cloudfront_distribution.web.domain_name
}

output "server_alb_dns_name" {
  description = "server ALB DNS 名"
  value       = aws_lb.server.dns_name
}

output "server_target_group_arn" {
  description = "server target group ARN"
  value       = aws_lb_target_group.server.arn
}

output "web_bucket_name" {
  description = "Web S3 バケット名"
  value       = aws_s3_bucket.web.id
}

output "github_actions_role_arn" {
  description = "GitHub Actions IAM ロール ARN"
  value       = aws_iam_role.github_actions.arn
}

output "dynamodb_table_name" {
  description = "DynamoDB テーブル名"
  value       = aws_dynamodb_table.main.name
}

output "dynamodb_table_arn" {
  description = "DynamoDB テーブル ARN"
  value       = aws_dynamodb_table.main.arn
}
