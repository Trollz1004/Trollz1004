# Deploy Team Claude Launcher to AWS
# Uses existing AWS account: joshlcoleman@gmail.com

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Team Claude Fund Generator to AWS..." -ForegroundColor Cyan

# Check AWS CLI
if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CLI not found. Installing..." -ForegroundColor Red
    choco install awscli -y
}

# Configure AWS credentials
Write-Host "`n🔐 Configuring AWS credentials..." -ForegroundColor Yellow
aws configure set aws_access_key_id "YOUR_ACCESS_KEY"
aws configure set aws_secret_access_key "YOUR_SECRET_KEY"
aws configure set default.region us-east-1

# Install SAM CLI if needed
if (!(Get-Command sam -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing AWS SAM CLI..." -ForegroundColor Yellow
    choco install aws-sam-cli -y
}

# Build and deploy
Write-Host "`n🔨 Building SAM application..." -ForegroundColor Yellow
Set-Location "c:\Users\T5500PRECISION\trollz1004\launcher"
sam build

Write-Host "`n🚀 Deploying to AWS..." -ForegroundColor Yellow
sam deploy --guided --stack-name team-claude-fund-launcher --capabilities CAPABILITY_IAM

# Upload icon to S3
Write-Host "`n📤 Uploading icon to S3..." -ForegroundColor Yellow
$BUCKET_NAME = (aws cloudformation describe-stacks --stack-name team-claude-fund-launcher --query "Stacks[0].Outputs[?OutputKey=='IconBucketUrl'].OutputValue" --output text)
aws s3 cp icon.svg s3://$BUCKET_NAME/icon.svg --acl public-read

# Get API endpoint
$API_URL = (aws cloudformation describe-stacks --stack-name team-claude-fund-launcher --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 API Endpoint: $API_URL" -ForegroundColor Cyan
Write-Host "🎨 Icon URL: $BUCKET_NAME/icon.svg" -ForegroundColor Cyan
Write-Host "💝 Charity: Shriners Children's Hospitals (50% donation)" -ForegroundColor Magenta
