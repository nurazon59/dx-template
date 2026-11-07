terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    bucket = "slack-bot-template-tfstate"
    key    = "terraform.tfstate"
    region = "ap-northeast-1"
  }
}
