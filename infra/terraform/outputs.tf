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
