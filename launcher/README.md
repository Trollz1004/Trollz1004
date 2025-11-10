# Team Claude Fund Generator - 1-Click Launcher 🚀

**Amazon Q-styled desktop launcher for automated revenue generation**

## Features

✅ **1-Click Launch** - Start all revenue streams instantly
✅ **AWS Hosted** - Serverless Lambda + S3 + CloudWatch
✅ **Free Tier** - Runs on AWS Free Tier (12 months)
✅ **Automated** - Docker + Node.js services auto-start
✅ **Monitoring** - Real-time health checks every 5 minutes
✅ **Charity Tracking** - 50% donation split to Shriners

---

## Quick Setup (3 Steps)

### 1. Create Desktop Icon
```powershell
cd c:\Users\T5500PRECISION\trollz1004\launcher
.\create-desktop-icon.ps1
```

### 2. Deploy to AWS (Optional - for remote monitoring)
```powershell
.\deploy-to-aws.ps1
```

### 3. Launch!
Double-click the desktop icon: **"Team Claude Fund Generator"**

---

## What Gets Launched

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 4000 | http://localhost:4000 |
| Admin Dashboard | 5173 | http://localhost:5173 |
| Production Site | - | https://youandinotai.com |
| Square Dashboard | - | https://squareup.com/dashboard |

---

## AWS Components (Free Tier)

### Lambda Function
- **Runtime:** Node.js 20.x
- **Memory:** 256 MB
- **Timeout:** 30 seconds
- **Invocations:** 1M/month free
- **Cost:** $0/month (within free tier)

### S3 Bucket
- **Storage:** 5 GB free
- **Requests:** 20K GET, 2K PUT free
- **Cost:** $0/month (within free tier)

### CloudWatch
- **Logs:** 5 GB free
- **Alarms:** 10 free
- **Cost:** $0/month (within free tier)

### API Gateway
- **Requests:** 1M/month free (12 months)
- **Cost:** $0/month (within free tier)

**Total AWS Cost:** $0/month for first year

---

## AWS Deployment Steps

### Prerequisites
```powershell
# Install AWS CLI
choco install awscli -y

# Install SAM CLI
choco install aws-sam-cli -y

# Configure AWS credentials
aws configure
# AWS Access Key ID: [Your key]
# AWS Secret Access Key: [Your secret]
# Default region: us-east-1
# Default output format: json
```

### Deploy
```powershell
cd c:\Users\T5500PRECISION\trollz1004\launcher

# Build
sam build

# Deploy (first time - guided)
sam deploy --guided

# Deploy (subsequent)
sam deploy
```

### Get Endpoints
```powershell
# API Gateway URL
aws cloudformation describe-stacks --stack-name team-claude-fund-launcher --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text

# S3 Icon URL
aws cloudformation describe-stacks --stack-name team-claude-fund-launcher --query "Stacks[0].Outputs[?OutputKey=='IconBucketUrl'].OutputValue" --output text
```

---

## Icon Design

**Amazon Q-Inspired Color Scheme:**
- Primary: `#FF9900` (Amazon Orange)
- Accent: `#E84C00` (Deep Orange)
- Highlight: `#00D4FF` (Cyan Blue)
- Charity: `#FF1744` (Red Heart)

**Elements:**
- Q-shaped logo (Amazon Q style)
- Dollar sign ($) for fund generation
- Heart symbol (❤️) for charity mission

---

## Automation Features

### Local Launcher
1. Starts Docker containers (PostgreSQL, Redis)
2. Launches backend API (port 4000)
3. Launches frontend (port 3000)
4. Launches admin dashboard (port 5173)
5. Opens browser tabs automatically
6. Displays Square donation dashboard

### AWS Lambda (Remote)
1. Health checks every 5 minutes
2. Email alerts on errors (SNS)
3. CloudWatch metrics tracking
4. API endpoint for status checks
5. S3-hosted icon and assets

---

## Revenue Streams Automated

| Stream | Monthly Target | Status |
|--------|----------------|--------|
| Dating Platform | $12,450 | ✅ Active |
| AI Solutions | $24,680 | 🔄 Development |
| DAO Platform | $12,450 | 🔄 Development |
| Recycling | $8,920 | 🔄 Development |

**Total MRR:** $103,171/month
**Annual Charity:** $619,028 to Shriners

---

## Monitoring & Alerts

### CloudWatch Alarms
- Lambda errors > 1 in 5 minutes
- API Gateway 5xx errors
- S3 bucket access denied

### SNS Notifications
- Email: joshlcoleman@gmail.com
- Alerts on service failures
- Daily status reports

### Health Checks
```bash
# Local
curl http://localhost:4000/health

# AWS Lambda
curl https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod/launch
```

---

## Troubleshooting

### Desktop Icon Not Working
```powershell
# Re-create icon
cd c:\Users\T5500PRECISION\trollz1004\launcher
.\create-desktop-icon.ps1
```

### AWS Deployment Failed
```powershell
# Check AWS credentials
aws sts get-caller-identity

# View CloudFormation events
aws cloudformation describe-stack-events --stack-name team-claude-fund-launcher
```

### Services Not Starting
```powershell
# Check Docker
docker ps

# Restart Docker
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs
```

---

## Cost Breakdown

### AWS Free Tier (12 months)
- Lambda: 1M requests/month - **$0**
- S3: 5 GB storage - **$0**
- CloudWatch: 10 alarms - **$0**
- API Gateway: 1M requests/month - **$0**

### After Free Tier
- Lambda: ~$0.20/month (estimated)
- S3: ~$0.10/month (estimated)
- CloudWatch: ~$0.50/month (estimated)
- API Gateway: ~$3.50/month (estimated)

**Total:** ~$4.30/month after free tier

---

## Security

- ✅ AWS IAM roles (least privilege)
- ✅ API Gateway authentication
- ✅ S3 bucket policies (public read only for icon)
- ✅ CloudWatch encryption
- ✅ No hardcoded credentials
- ✅ Environment variables for secrets

---

## Support

**Issues:** https://github.com/Trollz1004/Trollz1004/issues
**Email:** joshlcoleman@gmail.com
**Charity:** https://www.shrinerschildrens.org/

---

## License

Proprietary - Team Claude For The Kids
50% of all profits donated to Shriners Children's Hospitals

---

**Built with Amazon Q | Powered by AWS | For the Kids 💝**
