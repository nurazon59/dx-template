variable "project" {
  description = "プロジェクト名"
  type        = string
  default     = "slack-bot-template"
}

variable "region" {
  description = "AWS リージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR ブロック"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnets" {
  description = "パブリックサブネット CIDR"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "azs" {
  description = "使用する AZ"
  type        = list(string)
  default     = ["ap-northeast-1a", "ap-northeast-1c"]
}

variable "task_cpu" {
  description = "ECS タスク CPU (units)"
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "ECS タスクメモリ (MiB)"
  type        = number
  default     = 512
}

variable "log_retention_days" {
  description = "CloudWatch Logs 保持日数"
  type        = number
  default     = 30
}
