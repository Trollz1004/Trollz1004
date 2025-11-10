\# Cleanup Script - Remove files that don't align with 25% complete, $0 revenue reality
# Based on FUNDING_STATUS_REPORT.md honest assessment

Write-Host "🧹 Cleaning up misleading status files..." -ForegroundColor Cyan

$filesToDelete = @(
  # Misleading "COMPLETE" files
  "AUTOMATION-COMPLETE.md",
  "CLEANUP_COMPLETE.md",
  "DEPLOYMENT-COMPLETE.md",
  "POST-CLEANUP-COMPLETE.md",
  "PRODUCTION-LAUNCH-COMPLETE.md",
  "SELF-HOSTED-AI-COMPLETE.md",
    
  # Misleading "SUCCESS/LIVE/READY" files
  "LIVE-NOW.md",
  "PRODUCTION-READY.md",
  "READY_TO_LAUNCH.md",
  "SUCCESS-YOU-ARE-LIVE.md",
    
  # Misleading STATUS/SUMMARY files
  "AUTOMATION-EMPIRE-PLAN.md",
  "CURRENT_STATUS.md",
  "DEPLOYMENT-STATUS.md",
  "FINAL_STATUS.md",
  "FINAL-SUMMARY.md",
  "FINAL-DEPLOYMENT-SUMMARY.md",
  "SESSION-SUMMARY.md",
  "SESSION_PROGRESS_SUMMARY.md",
    
  # Misleading deployment guides/scripts (features don't exist)
  "COMPLETE_DEPLOYMENT_GUIDE.md",
  "CLOUD-DEPLOYMENT-README.md",
  "DEPLOY-CHECKLIST.md",
  "DEPLOY-FRONTEND-NOW.sh",
  "DEPLOY-NOW.sh",
  "DEPLOY-OPTIONS.md",
  "DEPLOY-RAILWAY.md",
  "DEPLOY-INSTRUCTIONS.md",
  "GO-LIVE.sh",
  "LAUNCH-MONEY-MAKER.sh",
  "launch-production.sh",
  "auto-deploy-youandinotai.sh",
  "ULTIMATE_DEPLOY.sh",
  "ONE-CLICK-DEPLOY.ps1",
  "COPILOT-DEPLOYMENT-PROMPT.md",
    
  # Features that don't exist
  "GRANT-AUTOMATION-SYSTEM.md",
  "INTEGRATION-PLAN.md",
  "LAUNCH_FOR_MONEY.md",
  "MASTER_AI_CONTEXT.md",
    
  # Obsolete status files
  "BACKEND_BUILD_ISSUES.md",
  "SELF-HOSTED-AI-SETUP.md",
    
  # Duplicate/obsolete guides
  "CLOUDFLARE-DNS-SETUP.md",
  "DNS-SETUP-CLOUDFLARE-IONOS.md",
  "DOMAIN-CONFIGURATION.md",
  "GITHUB_DOMAIN_VERIFICATION_STEPS.md",
  "TEAM-CLAUDE-DASHBOARD-DEPLOY-GUIDE.md",
  "RAILWAY-API-GUIDE.md",
  "QUICK-START-GUIDE.md",
  "QUICK-DEPLOY.md",
  "QUICK_REFERENCE.md",
  "QUICK_START.md",
  "START-HERE.md",
  "HOW-TO-ONE-CLICK.md",
  "HOW_TO_SHARE_AI_CONTEXT.md",
    
  # Obsolete email/prompt files
  "EMAIL_TO_MYSELF.txt",
  "PROMPT_FOR_AMAZON_Q.txt",
  "PROMPT_FOR_CLAUDE_CODE_BROWSER.txt",
  "PULL_REQUEST_DESCRIPTION.md",
  "SECURITY_DECISION.md",
    
  # Obsolete scripts
  "fix-522-complete.sh",
  "fix-cloudflare.sh",
  "health-check.sh",
  "monitor-dns-verification.sh",
  "monitor-services.sh",
  "run-grant-demo.sh",
  "test-grant-system.js",
  "grant-automation-worker.js",
  "compliance-monitor-worker.js",
  "health-dashboard.js",
  "deploy.html",
  "deployed-site-test.html",
    
  # Obsolete deployment scripts
  "deploy-from-windows.ps1",
  "deploy-grant-system.sh",
  "deploy-to-netlify.ps1",
  "deploy-to-railway.ps1",
  "deploy-windows.ps1",
  "quick-deploy.sh",
  "railway-api-deploy.sh",
  "start-all-services.ps1",
  "start-services.sh",
  "backup-all.sh",
  "backup-database.sh",
  "add-credentials.sh",
  "install-cloudedroid.sh",
  "install-deployment-tools.ps1",
  "setup-cloudflare-dns.ps1",
  "setup-cloudflare-dns.sh",
  "setup-dns-ssl.ps1",
    
  # Obsolete config files (keep working ones)
  "network-config.md",
  "DEPLOYMENT.md",
  "CLOUDFLARE-NETLIFY-DNS-GUIDE.md",
  "cloud-deploy-aws.yml",
  "cloud-deploy-gcp.yml",
    
  # Claude setup files (keep T5500-OLLAMA-SETUP.md, it's actually useful)
  "install-claude-code.ps1",
  "CLAUDE-CODE-FOR-THE-KIDS.md",
  "claude_desktop_config.json"
)

$deletedCount = 0
$notFoundCount = 0

foreach ($file in $filesToDelete) {
  $fullPath = Join-Path "c:\Users\T5500PRECISION\trollz1004" $file
  if (Test-Path $fullPath) {
    try {
      Remove-Item $fullPath -Force
      Write-Host "✅ Deleted: $file" -ForegroundColor Green
      $deletedCount++
    }
    catch {
      Write-Host "❌ Failed to delete: $file - $($_.Exception.Message)" -ForegroundColor Red
    }
  }
  else {
    Write-Host "⏭️  Not found (already deleted): $file" -ForegroundColor Gray
    $notFoundCount++
  }
}

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "   Deleted: $deletedCount files" -ForegroundColor Green
Write-Host "   Not found: $notFoundCount files" -ForegroundColor Gray
Write-Host "   Total processed: $($filesToDelete.Count) files" -ForegroundColor Cyan
Write-Host ""

Write-Host "Cleanup complete! Repository now aligned with FUNDING_STATUS_REPORT.md reality." -ForegroundColor Green
Write-Host "Status: 25% infrastructure complete, dollar 0 revenue" -ForegroundColor Yellow
Write-Host "Keeping: MISSION.md, FUNDING.md, README.md, FUNDING_STATUS_REPORT.md, T5500-OLLAMA-SETUP.md, actual code" -ForegroundColor Cyan
