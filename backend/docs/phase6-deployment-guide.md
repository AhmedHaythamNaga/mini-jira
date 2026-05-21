# Phase 6 — EC2 + ALB + ASG Deployment Guide (Button by Button)

This guide walks you through deploying the Mini-Jira backend to AWS. Every click is described.

**Prerequisites:** You must have completed Phases 1–5 (VPC, Cognito, DynamoDB, S3, Lambdas, SNS/SQS). The backend code is already pushed to the `ahmed` branch.

---

## Step 1: Launch an EC2 Instance

1. Go to **AWS Console** → search **EC2** → click **EC2**
2. In the left sidebar, click **Instances**
3. Click the orange **Launch instances** button (top right)

### Configure the instance:

4. **Name**: type `mini-jira-backend`
5. **Application and OS Images (AMI)**: 
   - Click **Amazon Linux** (should already be selected)
   - Make sure it says **Amazon Linux 2023 AMI** — this is free tier eligible
6. **Instance type**: select **t2.micro** (Free tier eligible)
7. **Key pair (login)**:
   - Click **Create new key pair**
   - **Key pair name**: type `mini-jira-key`
   - **Key pair type**: select **RSA**
   - **Private key file format**: select **.pem**
   - Click **Create key pair** — a `.pem` file downloads. Save it somewhere safe
8. **Network settings**: click **Edit**
   - **VPC**: select your custom VPC (the one you created in Phase 1)
   - **Subnet**: select one of your **private subnets**
   - **Auto-assign public IP**: select **Disable** (it's in a private subnet)
   - **Firewall (security groups)**: select **Select existing security group**
   - Check the box next to **EC2-SG** (the one that allows port 3000 from ALB-SG only)
9. **Advanced details** (click to expand):
   - **IAM instance profile**: select the **EC2 Role** you created in Phase 1 (the one with DynamoDB, S3, SNS, CloudWatch, Cognito permissions)
   - Scroll down to **User data** — paste this script:

```bash
#!/bin/bash
set -e

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs git

# Install PM2
npm install -g pm2

# Create app directory
mkdir -p /home/ec2-user/app
cd /home/ec2-user/app

# Clone your repo (REPLACE with your actual repo URL)
git clone -b ahmed https://github.com/AhmedHaythamNaga/mini-jira.git .

# Go to backend
cd backend

# Install dependencies and build
npm ci
npm run build

# Create .env file (REPLACE values with your actual AWS resource IDs)
cat > .env << 'EOF'
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=YOUR_ACTUAL_USER_POOL_ID
COGNITO_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID
DYNAMODB_USERS_TABLE=mini-jira-users
DYNAMODB_TEAMS_TABLE=mini-jira-teams
DYNAMODB_PROJECTS_TABLE=mini-jira-projects
DYNAMODB_TASKS_TABLE=mini-jira-tasks
DYNAMODB_COMMENTS_TABLE=mini-jira-comments
DYNAMODB_AUDIT_TABLE=mini-jira-audit
S3_ORIGINALS_BUCKET=mini-jira-original-images-2
S3_RESIZED_BUCKET=mini-jira-resized-images-2
SNS_TASK_ASSIGNMENT_TOPIC_ARN=YOUR_ACTUAL_SNS_TOPIC_ARN
PORT=3000
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save

# Set PM2 to start on boot
env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
pm2 save

chown -R ec2-user:ec2-user /home/ec2-user/app
```

10. Click **Launch instance**
11. Wait for the instance state to show **Running** and status checks to show **2/2 checks passed** (takes 2–3 minutes)

---

## Step 2: Verify the Instance Works

Since the instance is in a private subnet, you can't SSH directly. To verify:

1. Go to **EC2** → **Instances** → select your instance
2. Click **Connect** (top right)
3. Select the **Session Manager** tab
4. Click **Connect** (this opens a browser-based terminal — requires SSM agent, which Amazon Linux 2023 has by default, but your EC2 role needs `AmazonSSMManagedInstanceCore` policy)
5. In the terminal, run:
```bash
curl http://localhost:3000/api/health
```
6. You should see: `{"status":"ok","timestamp":"..."}`

**If Session Manager doesn't work:** Add the `AmazonSSMManagedInstanceCore` managed policy to your EC2 IAM role:
- Go to **IAM** → **Roles** → find your EC2 role → **Add permissions** → **Attach policies** → search `AmazonSSMManagedInstanceCore` → check it → **Add permissions**
- Reboot the instance and try again

---

## Step 3: Create an AMI from the Instance

Once the health check passes, create an AMI so the Auto Scaling Group can launch identical copies.

1. Go to **EC2** → **Instances** → select your running instance
2. Click **Actions** (top right) → **Image and templates** → **Create image**
3. **Image name**: type `mini-jira-backend-ami`
4. **Image description**: type `Mini-Jira backend with Node.js, PM2, and app code`
5. Leave everything else as default
6. Click **Create image**
7. In the left sidebar, click **AMIs** → wait for the status to change from **pending** to **available** (takes 3–5 minutes)
8. **Copy the AMI ID** (e.g., `ami-0abc1234567890def`) — you need it for the Launch Template

---

## Step 4: Create a Target Group

The ALB needs a Target Group to know where to send traffic.

1. Go to **EC2** → left sidebar → **Target Groups** (under Load Balancing)
2. Click **Create target group**
3. **Choose a target type**: select **Instances**
4. **Target group name**: type `mini-jira-tg`
5. **Protocol**: **HTTP**
6. **Port**: **3000**
7. **VPC**: select your custom VPC
8. **Health checks**:
   - **Health check protocol**: **HTTP**
   - **Health check path**: type `/api/health`
9. Click **Next**
10. **Do NOT register any targets** yet (the ASG will do this automatically)
11. Click **Create target group**

---

## Step 5: Create an Application Load Balancer

1. Go to **EC2** → left sidebar → **Load Balancers**
2. Click **Create load balancer**
3. Under **Application Load Balancer**, click **Create**

### Configure:

4. **Load balancer name**: type `mini-jira-alb`
5. **Scheme**: select **Internet-facing**
6. **IP address type**: **IPv4**
7. **Network mapping**:
   - **VPC**: select your custom VPC
   - **Mappings**: check **both Availability Zones** and select the **public subnet** in each AZ
8. **Security groups**: 
   - Remove the default security group
   - Select **ALB-SG** (the one that allows inbound 80 and 443 from anywhere)
9. **Listeners and routing**:
   - **Protocol**: **HTTP**, **Port**: **80**
   - **Default action**: **Forward to** → select **mini-jira-tg**
10. Click **Create load balancer**
11. Wait for the state to change to **Active** (takes 2–3 minutes)
12. **Copy the DNS name** (e.g., `mini-jira-alb-1234567890.us-east-1.elb.amazonaws.com`) — this is your public URL

### Test the ALB:

13. Open a browser and go to: `http://YOUR-ALB-DNS-NAME/api/health`
14. You should see: `{"status":"ok","timestamp":"..."}`

**If it doesn't work yet**, that's normal — the ASG hasn't registered instances in the target group yet. Continue to Step 6.

---

## Step 6: Create a Launch Template

1. Go to **EC2** → left sidebar → **Launch Templates**
2. Click **Create launch template**
3. **Launch template name**: type `mini-jira-lt`
4. **Template version description**: type `Phase 6 initial`
5. **Application and OS Images**: click **My AMIs** → select **mini-jira-backend-ami**
6. **Instance type**: select **t2.micro**
7. **Key pair**: select **mini-jira-key**
8. **Network settings**:
   - **Security groups**: select **EC2-SG**
9. **Advanced details** (expand):
   - **IAM instance profile**: select your EC2 Role
10. Click **Create launch template**

---

## Step 7: Create an Auto Scaling Group

1. Go to **EC2** → left sidebar → **Auto Scaling Groups**
2. Click **Create Auto Scaling group**

### Step 7a: Choose launch template

3. **Auto Scaling group name**: type `mini-jira-asg`
4. **Launch template**: select **mini-jira-lt**
5. Click **Next**

### Step 7b: Choose instance launch options

6. **VPC**: select your custom VPC
7. **Availability Zones and subnets**: select **both private subnets** (one per AZ)
8. Click **Next**

### Step 7c: Configure advanced options

9. **Load balancing**: select **Attach to an existing load balancer**
10. **Attach to an existing load balancer**: select **Choose from your load balancer target groups**
11. **Existing load balancer target groups**: select **mini-jira-tg**
12. **Health checks**:
    - Check **Turn on Elastic Load Balancing health checks**
    - **Health check grace period**: type `120` seconds
13. Click **Next**

### Step 7d: Configure group size and scaling

14. **Group size**:
    - **Desired capacity**: `2`
    - **Minimum capacity**: `2`
    - **Maximum capacity**: `4`
15. **Scaling policies**: select **Target tracking scaling policy**
    - **Scaling policy name**: `cpu-target-tracking`
    - **Metric type**: **Average CPU utilization**
    - **Target value**: `70`
16. Click **Next**

### Step 7e: Add notifications (optional)

17. Click **Next** (skip this)

### Step 7f: Add tags

18. Click **Add tag**:
    - **Key**: `Name`, **Value**: `mini-jira-backend`
19. Click **Next**

### Step 7g: Review

20. Review everything → click **Create Auto Scaling group**

---

## Step 8: Verify Everything Works

1. Wait 3–5 minutes for the ASG to launch 2 instances
2. Go to **EC2** → **Target Groups** → click **mini-jira-tg** → **Targets** tab
3. You should see 2 instances with status **healthy**
4. Open a browser: `http://YOUR-ALB-DNS-NAME/api/health`
5. You should see: `{"status":"ok","timestamp":"..."}`

### Test the login endpoint:

Open a terminal and run:
```bash
curl -X POST http://YOUR-ALB-DNS-NAME/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@company.com","password":"YOUR_PASSWORD"}'
```

You should get back `idToken`, `accessToken`, and `refreshToken`.

### Test an authenticated endpoint:

```bash
# Use the idToken from the login response
curl http://YOUR-ALB-DNS-NAME/api/teams \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

---

## Step 9: Terminate the Original Instance

Now that the ASG manages your instances, you can terminate the first one you created manually.

1. Go to **EC2** → **Instances**
2. Find the original `mini-jira-backend` instance (not the ones launched by the ASG — those have the ASG name in their tags)
3. Select it → **Instance state** → **Terminate instance** → **Terminate**

---

## Summary — What You Now Have

| Component | Details |
|-----------|---------|
| **ALB** | Internet-facing, in public subnets, forwards port 80 to port 3000 |
| **Target Group** | Health check on `/api/health`, port 3000 |
| **ASG** | min=2, desired=2, max=4, scales at 70% CPU |
| **EC2 Instances** | In private subnets, running PM2 + NestJS, using IAM role for AWS access |
| **Public URL** | `http://YOUR-ALB-DNS-NAME/api/...` |

### All API Endpoints Available:

```
POST   /api/auth/login              (public)
GET    /api/health                  (public)

GET    /api/users                   (manager, admin)
POST   /api/users                   (manager, admin)
GET    /api/users/:id               (any authenticated)
PUT    /api/users/:id               (manager, admin)
DELETE /api/users/:id               (admin)

GET    /api/teams                   (manager, admin)
POST   /api/teams                   (manager, admin)
GET    /api/teams/:id               (any authenticated)
PUT    /api/teams/:id               (manager, admin)
DELETE /api/teams/:id               (admin)

GET    /api/projects                (any authenticated)
POST   /api/projects                (manager, admin)
GET    /api/projects/:id            (any authenticated)
PUT    /api/projects/:id            (manager, admin)
DELETE /api/projects/:id            (manager, admin)

GET    /api/tasks                   (team-filtered for employees)
POST   /api/tasks                   (manager, admin — triggers SNS)
GET    /api/tasks/:id               (any authenticated)
PUT    /api/tasks/:id               (manager or assignee)
PUT    /api/tasks/:id/assign        (manager, admin)
DELETE /api/tasks/:id               (manager, admin)
GET    /api/tasks/:id/upload-url    (any authenticated)
PUT    /api/tasks/:id/image         (any authenticated)
GET    /api/tasks/:id/image         (any authenticated)
GET    /api/tasks/by-project/:pid   (team-filtered)
GET    /api/tasks/by-assignee/:aid  (any authenticated)

POST   /api/tasks/:id/comments      (any authenticated)
GET    /api/tasks/:id/comments       (any authenticated)

GET    /api/tasks/:id/audit          (any authenticated)
```
