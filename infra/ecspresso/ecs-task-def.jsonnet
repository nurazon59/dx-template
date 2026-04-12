{
  family: 'slack-bot-template',
  cpu: '256',
  memory: '512',
  networkMode: 'awsvpc',
  requiresCompatibilities: ['FARGATE'],
  executionRoleArn: 'arn:aws:iam::{{ must_env `AWS_ACCOUNT_ID` }}:role/slack-bot-template-task-execution',
  taskRoleArn: 'arn:aws:iam::{{ must_env `AWS_ACCOUNT_ID` }}:role/slack-bot-template-task',
  containerDefinitions: [
    {
      name: 'app',
      image: '{{ must_env `AWS_ACCOUNT_ID` }}.dkr.ecr.ap-northeast-1.amazonaws.com/slack-bot-template:{{ env `IMAGE_TAG` `latest` }}',
      essential: true,
      environment: [
        {
          name: 'SERVER_URL',
          value: 'http://{{ tfstate `aws_lb.server.dns_name` }}',
        },
      ],
      secrets: [
        {
          name: 'SLACK_BOT_TOKEN',
          valueFrom: '/slack-bot-template/SLACK_BOT_TOKEN',
        },
        {
          name: 'SLACK_APP_TOKEN',
          valueFrom: '/slack-bot-template/SLACK_APP_TOKEN',
        },
      ],
      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': '/ecs/slack-bot-template',
          'awslogs-region': 'ap-northeast-1',
          'awslogs-stream-prefix': 'app',
        },
      },
    },
  ],
}
