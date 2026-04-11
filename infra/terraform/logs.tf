resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name_prefix}"
  retention_in_days = var.log_retention_days

  tags = { Name = "${local.name_prefix}-logs" }
}

resource "aws_cloudwatch_log_group" "server" {
  name              = "/ecs/dx-template-server"
  retention_in_days = var.log_retention_days

  tags = { Name = "dx-template-server-logs" }
}
