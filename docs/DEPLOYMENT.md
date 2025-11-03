# Production Deployment Guide

**Platform:** AWS ECS (Elastic Container Service)  
**Database:** AWS RDS PostgreSQL 15  
**Cache:** AWS ElastiCache Redis  
**Storage:** AWS S3 for user photos  
**CDN:** AWS CloudFront  
**DNS:** Route 53 with SSL/TLS (ACM)

---

## Prerequisites

- AWS Account with appropriate IAM permissions
- Docker installed locally
- AWS CLI v2 configured with credentials
- PostgreSQL 15+ client tools
- Git and GitHub access

---

## Part 1: Local Development Setup

### 1.1 Clone and Setup

```bash
git clone https://github.com/your-org/antiaidating.git
cd antiaidating
```

### 1.2 Environment Configuration

Create `.env` file:
```env
# Database (local PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/antiaidating_dev
DATABASE_POOL_SIZE=5

# JWT
JWT_SECRET=your-local-dev-secret-min-32-characters
JWT_EXPIRY=24h

# Square (Use TEST/SANDBOX for local dev)
SQUARE_ACCESS_TOKEN=sq_test_xxxxx
SQUARE_ENVIRONMENT=Sandbox

# Twilio
TWILIO_ACCOUNT_SID=AC_test_xxxxx
TWILIO_AUTH_TOKEN=test_token
TWILIO_PHONE_NUMBER=+15005550006

# Email (Use Mailtrap for local testing)
SMTP_HOST=live.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass

# Redis (local)
REDIS_URL=redis://localhost:6379

# Encryption
ENCRYPTION_KEY=your-base64-aes-256-key-32-bytes
```

### 1.3 Start Local Development Stack

```bash
docker-compose -f docker-compose.dev.yml up -d

# Verify services
docker-compose -f docker-compose.dev.yml ps

# Output:
# NAME              STATUS      PORTS
# antiaidating-db   Up 2 mins   5432/tcp
# antiaidating-redis Up 2 mins 6379/tcp
# antiaidating-app  Up 1 min    3000->3000/tcp
```

### 1.4 Initialize Database

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d antiaidating_dev

# Run migrations
npm run migrate:up

# Seed test data
npm run seed
```

### 1.5 Verify Local Setup

```bash
# Test API health check
curl http://localhost:3000/health

# Output:
# {"status":"healthy","timestamp":"2025-11-02T10:00:00Z","version":"1.0.0"}

# Test database connection
curl http://localhost:3000/api/auth/signup \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

---

## Part 2: Production AWS Deployment

### 2.1 Create AWS Resources

#### Step 1: Create RDS PostgreSQL Instance

```bash
# Create security group for RDS
aws ec2 create-security-group \
  --group-name antiaidating-rds-sg \
  --description "RDS PostgreSQL security group for Anti-AI Dating" \
  --region us-east-1

# Note: Save the group ID (sg-xxxxxxxx)

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier antiaidating-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username admin \
  --master-user-password 'GenerateStrongPassword123!' \
  --allocated-storage 100 \
  --backup-retention-period 30 \
  --multi-az \
  --publicly-accessible false \
  --db-subnet-group-name default \
  --vpc-security-group-ids sg-xxxxxxxx \
  --enable-cloudwatch-logs-exports postgresql \
  --enable-iam-database-authentication \
  --storage-encrypted \
  --region us-east-1

# Wait for instance to be available (5-10 minutes)
aws rds describe-db-instances \
  --db-instance-identifier antiaidating-prod \
  --region us-east-1 \
  --query 'DBInstances[0].DBInstanceStatus'
```

#### Step 2: Create ElastiCache Redis Instance

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id antiaidating-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxxxxx \
  --parameter-group-name default.redis7 \
  --region us-east-1

# Enable automatic failover for production
aws elasticache create-replication-group \
  --replication-group-description "Anti-AI Dating Redis" \
  --replication-group-id antiaidating-redis-prod \
  --cache-node-type cache.t3.small \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --region us-east-1
```

#### Step 3: Create S3 Bucket for Photos

```bash
# Create S3 bucket
aws s3 mb s3://antiaidating-photos --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket antiaidating-photos \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket antiaidating-photos \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket antiaidating-photos \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create CloudFront distribution (for CDN)
# See CloudFront distribution config below
```

#### Step 4: Create ECR Repository

```bash
# Create ECR repo
aws ecr create-repository \
  --repository-name antiaidating \
  --region us-east-1

# Output:
# {
#   "repository": {
#     "repositoryUri": "123456789.dkr.ecr.us-east-1.amazonaws.com/antiaidating"
#   }
# }

# Enable image scanning
aws ecr put-image-scanning-configuration \
  --repository-name antiaidating \
  --image-scanning-configuration scanOnPush=true \
  --region us-east-1
```

### 2.2 Build and Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t antiaidating:latest \
  --build-arg NODE_ENV=production \
  --build-arg VERSION=1.0.0 \
  .

# Tag for ECR
docker tag antiaidating:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/antiaidating:latest

# Push to ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/antiaidating:latest

# Verify push
aws ecr describe-images \
  --repository-name antiaidating \
  --region us-east-1
```

### 2.3 Create ECS Cluster and Service

#### Step 1: Create Cluster

```bash
aws ecs create-cluster \
  --cluster-name antiaidating-prod \
  --cluster-settings name=containerInsights,value=enabled \
  --region us-east-1
```

#### Step 2: Create Task Definition

```bash
# Save this as ecs-task-definition.json
cat > ecs-task-definition.json << 'EOF'
{
  "family": "antiaidating-prod",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskRole",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "antiaidating",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/antiaidating:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "LOG_LEVEL",
          "value": "info"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:antiaidating/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:antiaidating/jwt-secret"
        },
        {
          "name": "SQUARE_ACCESS_TOKEN",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:antiaidating/square-token"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/antiaidating",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json \
  --region us-east-1
```

#### Step 3: Create ECS Service

```bash
aws ecs create-service \
  --cluster antiaidating-prod \
  --service-name antiaidating-svc \
  --task-definition antiaidating-prod:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=DISABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/antiaidating/xxxxx,containerName=antiaidating,containerPort=3000 \
  --enable-service-registries registryArn=arn:aws:servicediscovery:us-east-1:ACCOUNT_ID:service/antiaidating \
  --region us-east-1
```

### 2.4 Setup Application Load Balancer (ALB)

```bash
# Create target group
aws elbv2 create-target-group \
  --name antiaidating-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxxxx \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region us-east-1

# Create ALB
aws elbv2 create-load-balancer \
  --name antiaidating-alb \
  --subnets subnet-xxxxx subnet-xxxxx \
  --security-groups sg-xxxxx \
  --scheme internet-facing \
  --type application \
  --region us-east-1

# Create HTTPS listener (requires ACM certificate)
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:loadbalancer/app/antiaidating-alb/xxxxx \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/xxxxx \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/antiaidating-tg/xxxxx \
  --region us-east-1

# Redirect HTTP to HTTPS
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:loadbalancer/app/antiaidating-alb/xxxxx \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}" \
  --region us-east-1
```

### 2.5 Store Secrets in AWS Secrets Manager

```bash
# Database URL
aws secretsmanager create-secret \
  --name antiaidating/database-url \
  --description "PostgreSQL connection string" \
  --secret-string "postgresql://admin:GenerateStrongPassword123!@antiaidating-prod.xxxxx.us-east-1.rds.amazonaws.com:5432/antiaidating" \
  --region us-east-1

# JWT Secret
aws secretsmanager create-secret \
  --name antiaidating/jwt-secret \
  --description "JWT signing secret" \
  --secret-string "your-production-jwt-secret-min-32-characters-long" \
  --region us-east-1

# Square Production Token
aws secretsmanager create-secret \
  --name antiaidating/square-token \
  --description "Square Production API access token" \
  --secret-string "sq_live_xxxxx" \
  --region us-east-1

# Encryption Key
aws secretsmanager create-secret \
  --name antiaidating/encryption-key \
  --description "AES-256 encryption key (base64)" \
  --secret-string "your-base64-encoded-32-byte-key" \
  --region us-east-1
```

### 2.6 Initialize Production Database

```bash
# Connect to production RDS
psql -h antiaidating-prod.xxxxx.us-east-1.rds.amazonaws.com \
  -U admin \
  -d postgres

# Create database
CREATE DATABASE antiaidating;

# Exit and connect to new database
\q

psql -h antiaidating-prod.xxxxx.us-east-1.rds.amazonaws.com \
  -U admin \
  -d antiaidating

# Run migrations
# (Either run from CI/CD pipeline or manually execute SQL files)
```

---

## Part 3: CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'
      - 'Dockerfile'
      - '.github/workflows/deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/GitHubActionsRole
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: antiaidating
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster antiaidating-prod \
            --service antiaidating-svc \
            --force-new-deployment \
            --region us-east-1

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster antiaidating-prod \
            --services antiaidating-svc \
            --region us-east-1
```

---

## Part 4: Monitoring and Logging

### 4.1 CloudWatch Logs

```bash
# Create log group
aws logs create-log-group \
  --log-group-name /ecs/antiaidating \
  --region us-east-1

# Set retention policy (30 days)
aws logs put-retention-policy \
  --log-group-name /ecs/antiaidating \
  --retention-in-days 30 \
  --region us-east-1

# View logs
aws logs tail /ecs/antiaidating --follow
```

### 4.2 CloudWatch Alarms

```bash
# CPU Utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name antiaidating-high-cpu \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:alerts \
  --region us-east-1

# Memory utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name antiaidating-high-memory \
  --alarm-description "Alert when memory > 85%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:alerts \
  --region us-east-1
```

---

## Part 5: Post-Deployment Verification

```bash
# 1. Check service status
aws ecs describe-services \
  --cluster antiaidating-prod \
  --services antiaidating-svc \
  --region us-east-1

# 2. Check running tasks
aws ecs list-tasks \
  --cluster antiaidating-prod \
  --region us-east-1

# 3. Test health endpoint
curl https://api.antiaidating.com/health

# 4. Test authentication endpoint
curl -X POST https://api.antiaidating.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# 5. Check database connectivity
# (From bastion host or via parameter store query)
```

---

## Rollback Procedure

If deployment fails:

```bash
# 1. Identify last stable task definition
aws ecs describe-task-definition \
  --task-definition antiaidating-prod \
  --region us-east-1

# 2. Update service to use previous revision
aws ecs update-service \
  --cluster antiaidating-prod \
  --service antiaidating-svc \
  --task-definition antiaidating-prod:PREVIOUS_REVISION \
  --force-new-deployment \
  --region us-east-1

# 3. Wait for rollback
aws ecs wait services-stable \
  --cluster antiaidating-prod \
  --services antiaidating-svc \
  --region us-east-1

# 4. Verify
curl https://api.antiaidating.com/health
```

---

## Disaster Recovery

### Automated Backups

- **RDS**: 30-day automated backups enabled
- **S3**: Versioning and MFA Delete enabled
- **Secrets Manager**: Automatic versioning

### Manual Backup

```bash
# Create RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier antiaidating-prod \
  --db-snapshot-identifier antiaidating-snapshot-$(date +%Y%m%d) \
  --region us-east-1

# S3 backup (daily via S3 lifecycle)
aws s3 sync s3://antiaidating-photos s3://antiaidating-backups/photos-$(date +%Y%m%d)/
```

---

**Last Updated:** November 2, 2025  
**Next Review:** December 2, 2025  
**Owner:** DevOps Team
