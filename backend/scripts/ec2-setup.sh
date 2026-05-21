#!/bin/bash
set -e

echo "=== Installing Node.js ==="
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git

echo "=== Installing PM2 globally ==="
sudo npm install -g pm2

echo "=== Cloning repository ==="
cd /home/ec2-user
# git clone https://github.com/YOUR_TEAM/mini-jira-backend.git
# cd mini-jira-backend

echo "=== Installing dependencies ==="
npm ci --production=false

echo "=== Building the project ==="
npm run build

echo "=== Setting up environment variables ==="
cat > .env << 'ENVEOF'
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID
COGNITO_CLIENT_ID=YOUR_CLIENT_ID
DYNAMODB_USERS_TABLE=mini-jira-users
DYNAMODB_TEAMS_TABLE=mini-jira-teams
DYNAMODB_PROJECTS_TABLE=mini-jira-projects
DYNAMODB_TASKS_TABLE=mini-jira-tasks
DYNAMODB_COMMENTS_TABLE=mini-jira-comments
DYNAMODB_AUDIT_TABLE=mini-jira-audit
S3_ORIGINALS_BUCKET=mini-jira-original-images-2
S3_RESIZED_BUCKET=mini-jira-resized-images-2
SNS_TASK_ASSIGNMENT_TOPIC_ARN=YOUR_SNS_TOPIC_ARN
PORT=3000
ENVEOF

echo "=== Starting with PM2 ==="
pm2 start ecosystem.config.js
pm2 save

echo "=== Setting PM2 to start on boot ==="
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
pm2 save

echo "=== Setup complete! ==="
echo "Health check: curl http://localhost:3000/api/health"
