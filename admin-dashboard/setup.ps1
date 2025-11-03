# ============================================================================
# TROLLZ1004 ADMIN DASHBOARD - WINDOWS SETUP SCRIPT
# ============================================================================

Write-Host "🎛️  TROLLZ1004 Admin Dashboard Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "📦 Checking prerequisites..." -ForegroundColor Yellow
$nodeVersion = node -v
if ($nodeVersion -match "v(\d+)") {
    $majorVersion = [int]$matches[1]
    if ($majorVersion -lt 20) {
        Write-Host "❌ Node.js 20+ required. Current: $nodeVersion" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
}

# Check PostgreSQL
if (Get-Command psql -ErrorAction SilentlyContinue) {
    Write-Host "✅ PostgreSQL installed" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL not found. Please install PostgreSQL 15+" -ForegroundColor Red
    exit 1
}

# Check Redis
if (Get-Command redis-cli -ErrorAction SilentlyContinue) {
    Write-Host "✅ Redis installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Redis not found. Install Redis for caching & queues" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 Setting up backend..." -ForegroundColor Yellow
Set-Location backend

# Install backend dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing backend dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend node_modules exists, skipping install" -ForegroundColor Yellow
}

# Setup .env if not exists
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit backend\.env with your actual credentials" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}

# Create database if not exists
Write-Host "🗄️  Setting up database..." -ForegroundColor Yellow
$dbName = "admin_dashboard"
$dbExists = psql -lqt | Select-String -Pattern $dbName
if ($dbExists) {
    Write-Host "✅ Database '$dbName' already exists" -ForegroundColor Green
} else {
    Write-Host "Creating database '$dbName'..." -ForegroundColor Yellow
    createdb $dbName
    Write-Host "✅ Database created" -ForegroundColor Green
}

# Run migrations
Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
npm run db:migrate
Write-Host "✅ Migrations complete" -ForegroundColor Green

Set-Location ..

Write-Host ""
Write-Host "🎨 Setting up frontend..." -ForegroundColor Yellow
Set-Location frontend

# Install frontend dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend node_modules exists, skipping install" -ForegroundColor Yellow
}

# Setup .env if not exists
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating frontend .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ Frontend .env created" -ForegroundColor Green
} else {
    Write-Host "✅ Frontend .env exists" -ForegroundColor Green
}

Set-Location ..

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Edit environment files:"
Write-Host "   - backend\.env (add API keys, database credentials)"
Write-Host "   - frontend\.env (configure API URL)"
Write-Host ""
Write-Host "2. Start development servers:"
Write-Host "   Backend:  cd backend; npm run dev"
Write-Host "   Frontend: cd frontend; npm run dev"
Write-Host ""
Write-Host "3. Access dashboard:"
Write-Host "   Local: http://localhost:5173"
Write-Host "   Prod:  https://youandinotai.online"
Write-Host ""
Write-Host "📚 Documentation:"
Write-Host "   - README.md"
Write-Host "   - ADMIN_DASHBOARD_SPEC.md"
Write-Host "   - backend\src\database\schema.sql"
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Yellow
Write-Host "   - NEVER commit .env files"
Write-Host "   - Keep private keys secure"
Write-Host "   - Enable 2FA for production"
Write-Host "   - All data is REAL (no fake data)"
Write-Host ""
Write-Host "🚀 Happy building!" -ForegroundColor Cyan
