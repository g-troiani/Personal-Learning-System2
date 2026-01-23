# Terraform configuration for Personal Learning System infrastructure
# AWS EC2 instance with security groups for backend API

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "key_name" {
  description = "Name of the SSH key pair to create"
  type        = string
  default     = "learning-system-key"
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed for SSH access (your IP)"
  type        = string
  default     = "0.0.0.0/0"  # CHANGE THIS to your IP for better security: "x.x.x.x/32"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

# Get latest Ubuntu 24.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Create SSH key pair
resource "tls_private_key" "ssh_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "learning_system" {
  key_name   = var.key_name
  public_key = tls_private_key.ssh_key.public_key_openssh
}

# Save private key locally
resource "local_file" "private_key" {
  content         = tls_private_key.ssh_key.private_key_pem
  filename        = "${path.module}/${var.key_name}.pem"
  file_permission = "0400"
}

# Security Group
resource "aws_security_group" "learning_system" {
  name        = "learning-system-sg"
  description = "Security group for Personal Learning System API"

  # SSH access (restrict to your IP in production)
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # HTTP (for Let's Encrypt and redirects)
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "learning-system-sg"
    Project = "personal-learning-system"
  }
}

# EC2 Instance
resource "aws_instance" "learning_system" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.learning_system.key_name
  vpc_security_group_ids = [aws_security_group.learning_system.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  # User data script to install Docker and dependencies
  user_data = <<-EOF
    #!/bin/bash
    set -e

    # Update system
    apt-get update && apt-get upgrade -y

    # Install Docker
    apt-get install -y docker.io docker-compose-v2
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ubuntu

    # Install Nginx and Certbot
    apt-get install -y nginx certbot python3-certbot-nginx

    # Create app directory
    mkdir -p /home/ubuntu/app
    chown ubuntu:ubuntu /home/ubuntu/app

    echo "Setup complete. SSH in and deploy the application."
  EOF

  tags = {
    Name    = "learning-system"
    Project = "personal-learning-system"
  }
}

# Elastic IP
resource "aws_eip" "learning_system" {
  instance = aws_instance.learning_system.id
  domain   = "vpc"

  tags = {
    Name    = "learning-system-eip"
    Project = "personal-learning-system"
  }
}

# Outputs
output "elastic_ip" {
  description = "Elastic IP address of the EC2 instance"
  value       = aws_eip.learning_system.public_ip
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.learning_system.id
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ${path.module}/${var.key_name}.pem ubuntu@${aws_eip.learning_system.public_ip}"
}

output "ssh_config_entry" {
  description = "Entry to add to ~/.ssh/config"
  value       = <<-EOT

    Host learning-prod
        HostName ${aws_eip.learning_system.public_ip}
        User ubuntu
        IdentityFile ${abspath("${path.module}/${var.key_name}.pem")}
  EOT
}
