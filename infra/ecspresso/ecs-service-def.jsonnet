{
  deploymentConfiguration: {
    deploymentCircuitBreaker: {
      enable: true,
      rollback: true,
    },
    maximumPercent: 200,
    minimumHealthyPercent: 100,
  },
  desiredCount: 1,
  enableECSManagedTags: true,
  launchType: 'FARGATE',
  networkConfiguration: {
    awsvpcConfiguration: {
      assignPublicIp: 'ENABLED',
      securityGroups: [
        '{{ tfstate `aws_security_group.ecs.id` }}',
      ],
      subnets: [
        '{{ tfstate `aws_subnet.public[0].id` }}',
        '{{ tfstate `aws_subnet.public[1].id` }}',
      ],
    },
  },
  platformVersion: 'LATEST',
  propagateTags: 'TASK_DEFINITION',
  schedulingStrategy: 'REPLICA',
}
