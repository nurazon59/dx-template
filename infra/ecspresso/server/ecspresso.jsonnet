{
  region: 'ap-northeast-1',
  cluster: 'slack-bot-template',
  service: 'dx-template-server',
  service_definition: 'ecs-service-def.jsonnet',
  task_definition: 'ecs-task-def.jsonnet',
  timeout: '10m0s',
  plugins: [
    {
      name: 'tfstate',
      config: {
        url: 's3://slack-bot-template-tfstate/terraform.tfstate',
      },
    },
  ],
}
