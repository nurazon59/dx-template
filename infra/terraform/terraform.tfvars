project            = "slack-bot-template"
region             = "ap-northeast-1"
vpc_cidr           = "10.0.0.0/16"
public_subnets     = ["10.0.1.0/24", "10.0.2.0/24"]
azs                = ["ap-northeast-1a", "ap-northeast-1c"]
task_cpu           = 256
task_memory        = 512
log_retention_days = 30
