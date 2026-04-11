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
  loadBalancers: [
    {
      targetGroupArn: '{{ tfstate `aws_lb_target_group.server.arn` }}',
      containerName: 'app',
      containerPort: 3000,
    },
  ],
  networkConfiguration: {
    awsvpcConfiguration: {
      assignPublicIp: 'DISABLED',
      securityGroups: [
        '{{ tfstate `aws_security_group.ecs.id` }}',
      ],
      subnets: [
        '{{ tfstate `aws_subnet.private[0].id` }}',
        '{{ tfstate `aws_subnet.private[1].id` }}',
      ],
    },
  },
  platformVersion: 'LATEST',
  propagateTags: 'TASK_DEFINITION',
  schedulingStrategy: 'REPLICA',
}
