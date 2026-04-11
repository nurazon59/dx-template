terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # 初回は local backend で apply し、S3 バケット作成後に切り替える
  # terraform init -migrate-state
  # backend "s3" {
  #   bucket = "slack-bot-template-tfstate"
  #   key    = "terraform.tfstate"
  #   region = "ap-northeast-1"
  # }
}
