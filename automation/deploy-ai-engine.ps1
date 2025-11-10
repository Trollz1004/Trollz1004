# Deploy 24/7 AI Content Engine

$ErrorActionPreference = "Stop"

Write-Host "🤖 Deploying Team Claude AI Content Engine..." -ForegroundColor Cyan

# Choose deployment method
Write-Host "`nSelect deployment method:" -ForegroundColor Yellow
Write-Host "1. AWS Lambda (Serverless - FREE)" -ForegroundColor Green
Write-Host "2. Docker (Local 24/7)" -ForegroundColor Green
Write-Host "3. Both (Recommended)" -ForegroundColor Magenta

$choice = Read-Host "Enter choice (1-3)"

if ($choice -eq "1" -or $choice -eq "3") {
    Write-Host "`n🚀 Deploying to AWS Lambda..." -ForegroundColor Cyan
    
    cd c:\Users\T5500PRECISION\trollz1004\automation
    
    # Build and deploy
    sam build -t aws-eventbridge-schedule.yml
    sam deploy --guided --stack-name team-claude-ai-engine --capabilities CAPABILITY_IAM
    
    Write-Host "✅ AWS Lambda deployed!" -ForegroundColor Green
    Write-Host "📊 EventBridge schedules active (24/7 automation)" -ForegroundColor Cyan
}

if ($choice -eq "2" -or $choice -eq "3") {
    Write-Host "`n🐳 Starting Docker containers..." -ForegroundColor Cyan
    
    cd c:\Users\T5500PRECISION\trollz1004\automation
    
    # Install dependencies
    npm install
    
    # Start Docker
    docker-compose -f docker-compose-ai.yml up -d --build
    
    Write-Host "✅ Docker containers running!" -ForegroundColor Green
    Write-Host "📊 View logs: docker-compose -f docker-compose-ai.yml logs -f" -ForegroundColor Cyan
}

Write-Host "`n🎉 AI Content Engine is now LIVE 24/7!" -ForegroundColor Magenta
Write-Host "`nAutomated tasks:" -ForegroundColor Yellow
Write-Host "  ✅ Twitter posts every 2 hours" -ForegroundColor Green
Write-Host "  ✅ Facebook posts every 3 hours" -ForegroundColor Green
Write-Host "  ✅ Instagram posts every 4 hours" -ForegroundColor Green
Write-Host "  ✅ LinkedIn posts every 6 hours" -ForegroundColor Green
Write-Host "  ✅ Blog posts daily at 9am" -ForegroundColor Green
Write-Host "  ✅ Comment monitoring every 15 minutes" -ForegroundColor Green
Write-Host "  ✅ Weekly campaigns every Monday" -ForegroundColor Green
Write-Host "`n💝 All content promotes 50% donation to Shriners!" -ForegroundColor Magenta
