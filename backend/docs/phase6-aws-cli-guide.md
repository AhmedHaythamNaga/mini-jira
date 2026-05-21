# Phase 6 — AWS CLI Deployment Guide

This guide shows you how to deploy the backend using the AWS CLI instead of clicking through the console.

---

## Install the AWS CLI

### macOS (you're on Mac):
```bash
# Option 1: Homebrew (easiest)
brew install awscli

# Option 2: Official installer
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Verify
aws --version
```

### Configure your credentials:
```bash
aws configure
```
It will ask you for 4 things:
- **AWS Access Key ID**: go to AWS Console → IAM → Users → your user → Security credentials → Create access key → copy it
- **AWS Secret Access Key**: shown once when you create the key — copy it
- **Default region**: type `us-east-1`
- **Default output format**: type `json`

---

## Step 1: Create a Key Pair

```bash
aws ec2 create-key-pair \
  --key-name mini-jira-key \
  --query 'KeyMaterial' \
  --output text > mini-jira-key.pem

chmod 400 mini-jira-key.pem
```

---

## Step 2: Create the Target Group

Replace `YOUR_VPC_ID` with your actual VPC ID (find it with `aws ec2 describe-vpcs`).

```bash
# Find your VPC ID
aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=*mini*" \
  --query 'Vpcs[0].VpcId' --output text

# Create target group
aws elbv2 create-target-group \
  --name mini-jira-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id YOUR_VPC_ID \
  --target-type instance \
  --health-check-protocol HTTP \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3
```

Copy the `TargetGroupArn` from the output — you need it later.

---

## Step 3: Create the Application Load Balancer

Replace `YOUR_PUBLIC_SUBNET_1`, `YOUR_PUBLIC_SUBNET_2`, and `YOUR_ALB_SG` with real IDs.

```bash
# Find your public subnets
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=YOUR_VPC_ID" "Name=tag:Name,Values=*public*" \
  --query 'Subnets[*].[SubnetId,Tags[?Key==`Name`].Value|[0]]' --output table

# Find your ALB security group
aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=YOUR_VPC_ID" "Name=group-name,Values=*ALB*" \
  --query 'SecurityGroups[*].[GroupId,GroupName]' --output table

# Create the ALB
aws elbv2 create-load-balancer \
  --name mini-jira-alb \
  --subnets YOUR_PUBLIC_SUBNET_1 YOUR_PUBLIC_SUBNET_2 \
  --security-groups YOUR_ALB_SG \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4
```

Copy the `LoadBalancerArn` and `DNSName` from the output.

---

## Step 4: Create an ALB Listener

```bash
aws elbv2 create-listener \
  --load-balancer-arn YOUR_ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=YOUR_TARGET_GROUP_ARN
```

---

## Step 5: Launch the First EC2 Instance

First, find the latest Amazon Linux 2023 AMI:

```bash
aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023*-x86_64" "Name=state,Values=available" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text
```

Now launch the instance. Replace all the `YOUR_*` placeholders:

```bash
aws ec2 run-instances \
  --image-id ami-XXXXXXXXXXXXXXXXX \
  --instance-type t2.micro \
  --key-name mini-jira-key \
  --subnet-id YOUR_PRIVATE_SUBNET_1 \
  --security-group-ids YOUR_EC2_SG \
  --iam-instance-profile Name=YOUR_EC2_ROLE_INSTANCE_PROFILE \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=mini-jira-backend}]' \
  --user-data file://backend/scripts/ec2-setup.sh
```

**Important:** Edit `backend/scripts/ec2-setup.sh` first to fill in your actual AWS resource IDs in the `.env` section.

Wait for the instance to be running:
```bash
aws ec2 wait instance-running --instance-ids YOUR_INSTANCE_ID
```

---

## Step 6: Verify via Session Manager

```bash
# Install the Session Manager plugin (one time)
# macOS:
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/sessionmanager-bundle.zip" -o "sessionmanager-bundle.zip"
unzip sessionmanager-bundle.zip
sudo ./sessionmanager-bundle/install -i /usr/local/sessionmanagerplugin -b /usr/local/bin/session-manager-plugin

# Start a session
aws ssm start-session --target YOUR_INSTANCE_ID

# Inside the session, test the app:
curl http://localhost:3000/api/health
```

---

## Step 7: Create an AMI

```bash
aws ec2 create-image \
  --instance-id YOUR_INSTANCE_ID \
  --name "mini-jira-backend-ami" \
  --description "Mini-Jira backend with Node.js PM2 and app code" \
  --no-reboot

# Wait for the AMI to be available
aws ec2 wait image-available --image-ids YOUR_NEW_AMI_ID
```

---

## Step 8: Create a Launch Template

```bash
aws ec2 create-launch-template \
  --launch-template-name mini-jira-lt \
  --version-description "Phase 6 initial" \
  --launch-template-data '{
    "ImageId": "YOUR_AMI_ID",
    "InstanceType": "t2.micro",
    "KeyName": "mini-jira-key",
    "SecurityGroupIds": ["YOUR_EC2_SG"],
    "IamInstanceProfile": {
      "Name": "YOUR_EC2_ROLE_INSTANCE_PROFILE"
    },
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [{"Key": "Name", "Value": "mini-jira-backend"}]
    }]
  }'
```

---

## Step 9: Create the Auto Scaling Group

```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name mini-jira-asg \
  --launch-template LaunchTemplateName=mini-jira-lt,Version='$Latest' \
  --min-size 2 \
  --max-size 4 \
  --desired-capacity 2 \
  --vpc-zone-identifier "YOUR_PRIVATE_SUBNET_1,YOUR_PRIVATE_SUBNET_2" \
  --target-group-arns YOUR_TARGET_GROUP_ARN \
  --health-check-type ELB \
  --health-check-grace-period 120
```

Add the CPU scaling policy:
```bash
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name mini-jira-asg \
  --policy-name cpu-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 70.0
  }'
```

---

## Step 10: Verify the Full Setup

```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn YOUR_TARGET_GROUP_ARN

# Get the ALB DNS name
aws elbv2 describe-load-balancers \
  --names mini-jira-alb \
  --query 'LoadBalancers[0].DNSName' --output text

# Test the health endpoint
curl http://YOUR_ALB_DNS/api/health

# Test login
curl -X POST http://YOUR_ALB_DNS/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@company.com","password":"YOUR_PASSWORD"}'
```

---

## Quick Reference: Find Your Resource IDs

If you already created resources in the console and need to find their IDs:

```bash
# VPC ID
aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,Tags[?Key==`Name`].Value|[0]]' --output table

# Subnet IDs
aws ec2 describe-subnets --query 'Subnets[*].[SubnetId,AvailabilityZone,Tags[?Key==`Name`].Value|[0]]' --output table

# Security Group IDs
aws ec2 describe-security-groups --query 'SecurityGroups[*].[GroupId,GroupName]' --output table

# IAM Instance Profiles
aws iam list-instance-profiles --query 'InstanceProfiles[*].[InstanceProfileName,Arn]' --output table

# Cognito User Pool ID
aws cognito-idp list-user-pools --max-results 10 --query 'UserPools[*].[Id,Name]' --output table

# Cognito App Client ID
aws cognito-idp list-user-pool-clients --user-pool-id YOUR_POOL_ID --query 'UserPoolClients[*].[ClientId,ClientName]' --output table

# SNS Topic ARN
aws sns list-topics --query 'Topics[*].TopicArn' --output table

# DynamoDB Tables
aws dynamodb list-tables

# S3 Buckets
aws s3 ls
```

---

## Terminate the Original Instance

Once the ASG is running with healthy targets:

```bash
aws ec2 terminate-instances --instance-ids YOUR_ORIGINAL_INSTANCE_ID
```
