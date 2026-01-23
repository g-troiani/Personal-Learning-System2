#!/bin/bash
# Deployment helper script for Personal Learning System
# Run this after Terraform creates the EC2 instance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Personal Learning System - Deployment Script${NC}"
echo "=============================================="

# Check if we're in the infrastructure directory
if [ ! -f "main.tf" ]; then
    echo -e "${RED}Error: Run this script from the infrastructure/ directory${NC}"
    exit 1
fi

# Get the Elastic IP from Terraform output
ELASTIC_IP=$(terraform output -raw elastic_ip 2>/dev/null || echo "")
if [ -z "$ELASTIC_IP" ]; then
    echo -e "${RED}Error: Could not get Elastic IP from Terraform. Run 'terraform apply' first.${NC}"
    exit 1
fi

echo -e "${GREEN}EC2 Elastic IP: $ELASTIC_IP${NC}"

# Check if the key file exists
KEY_FILE="./learning-system-key.pem"
if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}Error: SSH key file not found at $KEY_FILE${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 1: Waiting for EC2 instance to be ready...${NC}"
echo "This may take 2-3 minutes for first-time setup."

# Wait for SSH to be available
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i "$KEY_FILE" ubuntu@$ELASTIC_IP "echo 'SSH ready'" 2>/dev/null; then
        echo -e "${GREEN}SSH connection established!${NC}"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo "  Attempt $ATTEMPT/$MAX_ATTEMPTS - waiting for SSH..."
    sleep 10
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}Error: Could not connect to EC2 instance via SSH${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Deploying application to EC2...${NC}"

# Get the repository root (one level up from infrastructure/)
REPO_ROOT="$(cd .. && pwd)"
LEARN_SYSTEM_DIR="$REPO_ROOT/learn_system"

# Create deployment archive
echo "Creating deployment archive..."
cd "$REPO_ROOT"
tar --exclude='.git' \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='.env' \
    --exclude='*.pyc' \
    --exclude='venv' \
    --exclude='.venv' \
    -czf /tmp/learn_system_deploy.tar.gz learn_system/

# Copy to EC2
echo "Copying to EC2..."
scp -i "$REPO_ROOT/infrastructure/$KEY_FILE" /tmp/learn_system_deploy.tar.gz ubuntu@$ELASTIC_IP:/home/ubuntu/

# Extract and setup on EC2
echo "Extracting on EC2..."
ssh -i "$REPO_ROOT/infrastructure/$KEY_FILE" ubuntu@$ELASTIC_IP << 'REMOTE_SCRIPT'
cd /home/ubuntu
rm -rf app
mkdir -p app
tar -xzf learn_system_deploy.tar.gz -C app/
rm learn_system_deploy.tar.gz
echo "Files extracted to /home/ubuntu/app/learn_system/"
REMOTE_SCRIPT

# Cleanup local temp file
rm /tmp/learn_system_deploy.tar.gz

echo ""
echo -e "${GREEN}Deployment files copied successfully!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. SSH to the server: ssh -i $KEY_FILE ubuntu@$ELASTIC_IP"
echo "2. Create the .env file: nano /home/ubuntu/app/learn_system/.env"
echo "3. Start Docker: cd /home/ubuntu/app/learn_system && docker compose up -d --build"
echo "4. Configure Nginx and SSL (see EXECPLAN.md I3)"
echo ""
echo -e "${GREEN}SSH command:${NC}"
terraform output -raw ssh_command
