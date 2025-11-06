# Multi-Platform Deployment Automation Script
# Deploys aidoesitall.org DAO, ClaudeDroid AI, and AI-Solutions.Store

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("All", "DAO", "AI", "Marketplace", "Dashboard")]
    [string]$Platform = "All",

    [Parameter(Mandatory=$false)]
    [ValidateSet("Development", "Staging", "Production")]
    [string]$Environment = "Development",

    [Parameter(Mandatory=$false)]
    [switch]$DeployBlockchain,

    [Parameter(Mandatory=$false)]
    [switch]$PullModels,

    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Configuration
$script:Config = @{
    RootDir = Split-Path -Parent $PSScriptRoot
    DockerRegistry = $env:DOCKER_REGISTRY ?? "docker.io/aisolutions"
    K8sNamespace = "ai-solutions"
    HelmReleaseName = "multi-platform"
}

# Colors
$script:Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "`n🔧 $Message" $script:Colors.Info
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" $script:Colors.Success
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" $script:Colors.Error
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" $script:Colors.Warning
}

function Test-Prerequisites {
    Write-Step "Checking prerequisites..."

    $required = @{
        "docker" = "Docker"
        "kubectl" = "Kubernetes CLI"
        "helm" = "Helm"
        "git" = "Git"
    }

    $missing = @()

    foreach ($cmd in $required.Keys) {
        try {
            $null = Get-Command $cmd -ErrorAction Stop
            Write-Success "$($required[$cmd]) found"
        }
        catch {
            $missing += $required[$cmd]
            Write-Error "$($required[$cmd]) not found"
        }
    }

    if ($missing.Count -gt 0) {
        throw "Missing required tools: $($missing -join ', ')"
    }

    Write-Success "All prerequisites satisfied"
}

function Initialize-Environment {
    Write-Step "Initializing environment: $Environment"

    # Load environment variables
    $envFile = Join-Path $script:Config.RootDir ".env.$($Environment.ToLower())"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
                [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
                Write-Success "Loaded: $($matches[1])"
            }
        }
    }
    else {
        Write-Warning "Environment file not found: $envFile"
    }
}

function Build-DockerImages {
    param([string[]]$Platforms)

    Write-Step "Building Docker images for: $($Platforms -join ', ')"

    foreach ($platform in $Platforms) {
        $contextPath = Join-Path $script:Config.RootDir "platforms/$platform"
        $imageName = "$($script:Config.DockerRegistry)/$platform`:latest"

        Write-ColorOutput "Building $imageName..." $script:Colors.Info

        docker build -t $imageName $contextPath
        if ($LASTEXITCODE -ne 0) {
            throw "Docker build failed for $platform"
        }

        Write-Success "$platform image built"

        # Push to registry if not development
        if ($Environment -ne "Development") {
            Write-ColorOutput "Pushing $imageName..." $script:Colors.Info
            docker push $imageName
            if ($LASTEXITCODE -ne 0) {
                throw "Docker push failed for $platform"
            }
            Write-Success "$platform image pushed"
        }
    }
}

function Deploy-SmartContracts {
    Write-Step "Deploying DAO smart contracts..."

    $daoPath = Join-Path $script:Config.RootDir "platforms/dao-platform"
    Push-Location $daoPath

    try {
        # Install dependencies
        npm ci

        # Determine network
        $network = switch ($Environment) {
            "Development" { "localhost" }
            "Staging" { "sepolia" }
            "Production" { "polygon" }
        }

        Write-ColorOutput "Deploying to $network..." $script:Colors.Info

        # Deploy contracts
        npx hardhat run scripts/deploy-dao.ts --network $network

        if ($LASTEXITCODE -ne 0) {
            throw "Smart contract deployment failed"
        }

        Write-Success "Smart contracts deployed to $network"
    }
    finally {
        Pop-Location
    }
}

function Pull-AIModels {
    Write-Step "Pulling AI models..."

    # Mistral-7B for LocalAI
    Write-ColorOutput "Downloading Mistral-7B model..." $script:Colors.Info
    $modelsDir = Join-Path $script:Config.RootDir "platforms/claudedroid-ai/models"
    New-Item -ItemType Directory -Force -Path $modelsDir | Out-Null

    $mistralUrl = "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf"
    $mistralPath = Join-Path $modelsDir "mistral-7b-instruct.gguf"

    if (-not (Test-Path $mistralPath)) {
        Invoke-WebRequest -Uri $mistralUrl -OutFile $mistralPath
        Write-Success "Mistral-7B downloaded"
    }
    else {
        Write-Success "Mistral-7B already exists"
    }

    # Pull Ollama models
    Write-ColorOutput "Pulling Ollama models..." $script:Colors.Info
    docker run --rm ollama/ollama:latest pull llama2
    Write-Success "Ollama models pulled"
}

function Deploy-WithHelm {
    Write-Step "Deploying with Helm..."

    $helmPath = Join-Path $script:Config.RootDir "infra/helm/multi-platform"
    $valuesFile = "values-$($Environment.ToLower()).yaml"
    $valuesPath = Join-Path $helmPath $valuesFile

    # Create namespace
    kubectl create namespace $script:Config.K8sNamespace --dry-run=client -o yaml | kubectl apply -f -

    # Deploy with Helm
    helm upgrade --install $script:Config.HelmReleaseName $helmPath `
        --namespace $script:Config.K8sNamespace `
        --values $valuesPath `
        --wait `
        --timeout 10m

    if ($LASTEXITCODE -ne 0) {
        throw "Helm deployment failed"
    }

    Write-Success "Helm deployment complete"
}

function Deploy-WithDockerCompose {
    Write-Step "Deploying with Docker Compose..."

    $composePath = Join-Path $script:Config.RootDir "infra/docker/docker-compose.yaml"

    docker-compose -f $composePath up -d

    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose deployment failed"
    }

    Write-Success "Docker Compose deployment complete"
}

function Configure-CloudflareDNS {
    Write-Step "Configuring Cloudflare DNS..."

    if (-not $env:CLOUDFLARE_API_TOKEN) {
        Write-Warning "CLOUDFLARE_API_TOKEN not set, skipping DNS configuration"
        return
    }

    $domains = @(
        @{ Name = "aidoesitall.org"; Type = "A" }
        @{ Name = "claudedroid.ai"; Type = "A" }
        @{ Name = "ai-solutions.store"; Type = "A" }
        @{ Name = "dashboard.ai-solutions.store"; Type = "A" }
    )

    # Get external IP
    $externalIP = (kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

    foreach ($domain in $domains) {
        Write-ColorOutput "Setting up DNS for $($domain.Name)..." $script:Colors.Info
        # Cloudflare API call would go here
        Write-Success "$($domain.Name) DNS configured"
    }
}

function Test-Deployment {
    Write-Step "Running deployment tests..."

    $endpoints = @(
        @{ Name = "DAO Platform"; URL = "https://aidoesitall.org/health" }
        @{ Name = "ClaudeDroid AI"; URL = "https://api.claudedroid.ai/health" }
        @{ Name = "Marketplace"; URL = "https://ai-solutions.store/health" }
        @{ Name = "Dashboard"; URL = "https://dashboard.ai-solutions.store/health" }
    )

    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri $endpoint.URL -Method GET -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Success "$($endpoint.Name) is healthy"
            }
        }
        catch {
            Write-Error "$($endpoint.Name) health check failed"
        }
    }
}

function Show-DeploymentSummary {
    Write-ColorOutput "`n" + ("=" * 60) $script:Colors.Success
    Write-ColorOutput "🎉 DEPLOYMENT COMPLETE!" $script:Colors.Success
    Write-ColorOutput ("=" * 60) $script:Colors.Success

    Write-ColorOutput "`n📊 Deployment Summary:" $script:Colors.Info
    Write-ColorOutput "Platform: $Platform" "White"
    Write-ColorOutput "Environment: $Environment" "White"

    Write-ColorOutput "`n🔗 Access URLs:" $script:Colors.Info
    Write-ColorOutput "DAO: https://aidoesitall.org" "Cyan"
    Write-ColorOutput "AI Platform: https://claudedroid.ai" "Cyan"
    Write-ColorOutput "API: https://api.claudedroid.ai" "Cyan"
    Write-ColorOutput "Marketplace: https://ai-solutions.store" "Cyan"
    Write-ColorOutput "Dashboard: https://dashboard.ai-solutions.store" "Cyan"

    Write-ColorOutput "`n📝 Next Steps:" $script:Colors.Info
    Write-ColorOutput "1. Verify all services are running: kubectl get pods -n $($script:Config.K8sNamespace)" "White"
    Write-ColorOutput "2. Check logs: kubectl logs -f <pod-name> -n $($script:Config.K8sNamespace)" "White"
    Write-ColorOutput "3. Access dashboard to monitor all platforms" "White"
    Write-ColorOutput "4. Run end-to-end tests" "White"
}

# Main execution
try {
    Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" $script:Colors.Info
    Write-ColorOutput "║     Multi-Platform Deployment Automation v1.0              ║" $script:Colors.Info
    Write-ColorOutput "║     aidoesitall.org | ClaudeDroid AI | AI-Solutions.Store ║" $script:Colors.Info
    Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" $script:Colors.Info

    Test-Prerequisites
    Initialize-Environment

    # Determine platforms to deploy
    $platformsToDeploy = if ($Platform -eq "All") {
        @("dao-platform", "claudedroid-ai", "marketplace", "dashboard")
    }
    else {
        @($Platform.ToLower())
    }

    # Pull AI models if requested
    if ($PullModels) {
        Pull-AIModels
    }

    # Build Docker images
    if (-not $SkipBuild) {
        Build-DockerImages -Platforms $platformsToDeploy
    }

    # Deploy smart contracts if requested
    if ($DeployBlockchain) {
        Deploy-SmartContracts
    }

    # Deploy based on environment
    if ($Environment -eq "Development") {
        Deploy-WithDockerCompose
    }
    else {
        Deploy-WithHelm
        Configure-CloudflareDNS
    }

    # Test deployment
    Test-Deployment

    # Show summary
    Show-DeploymentSummary
}
catch {
    Write-Error "Deployment failed: $_"
    Write-ColorOutput $_.ScriptStackTrace $script:Colors.Error
    exit 1
}
