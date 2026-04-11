{
  family: 'dx-template-server',
  cpu: '256',
  memory: '512',
  networkMode: 'awsvpc',
  requiresCompatibilities: ['FARGATE'],
  executionRoleArn: 'arn:aws:iam::{{ must_env `AWS_ACCOUNT_ID` }}:role/slack-bot-template-task-execution',
  taskRoleArn: 'arn:aws:iam::{{ must_env `AWS_ACCOUNT_ID` }}:role/slack-bot-template-task',
  containerDefinitions: [
    {
      name: 'app',
      image: '{{ must_env `AWS_ACCOUNT_ID` }}.dkr.ecr.ap-northeast-1.amazonaws.com/dx-template-server:{{ env `IMAGE_TAG` `latest` }}',
      essential: true,
      portMappings: [
        {
          containerPort: 3000,
          protocol: 'tcp',
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
        {
          name: 'DATABASE_URL',
          valueFrom: '/slack-bot-template/DATABASE_URL',
        },
      ],
      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': '/ecs/dx-template-server',
          'awslogs-region': 'ap-northeast-1',
          'awslogs-stream-prefix': 'app',
        },
      },
    },
  ],
}
