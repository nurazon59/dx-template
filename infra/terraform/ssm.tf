resource "aws_ssm_parameter" "slack_bot_token" {
  name  = "/${local.name_prefix}/SLACK_BOT_TOKEN"
  type  = "SecureString"
  value = "placeholder"

  tags = { Name = "${local.name_prefix}-slack-bot-token" }

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "slack_app_token" {
  name  = "/${local.name_prefix}/SLACK_APP_TOKEN"
  type  = "SecureString"
  value = "placeholder"

  tags = { Name = "${local.name_prefix}-slack-app-token" }

  lifecycle {
    ignore_changes = [value]
  }
}
