resource "aws_lb" "server" {
  name               = "${local.name_prefix}-server"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = { Name = "${local.name_prefix}-server-alb" }
}

resource "aws_lb_target_group" "server" {
  name        = "${local.name_prefix}-server"
  port        = var.server_container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  deregistration_delay = 30

  health_check {
    enabled             = true
    path                = "/api/health"
    matcher             = "200"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }

  tags = { Name = "${local.name_prefix}-server-tg" }
}

resource "aws_lb_listener" "server_http" {
  load_balancer_arn = aws_lb.server.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.server.arn
  }
}
