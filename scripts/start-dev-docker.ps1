#Requires -RunAsAdministrator
# PM - Gestion de Projets - Docker Startup Script (PowerShell)
# Usage: Run as Administrator - .\start-dev-docker.ps1 [-Port <port>] [-SkipInstall]
# This script will install all required dependencies automatically

param(
    [int]$Port = 27017,
    [switch]$SkipInstall,
    [switch]$Help
)

# ============================================
# CONFIGURATION
# ============================================
$NODE_VERSION = "20"  # LTS version
$ErrorActionPreference = "Stop"

# Ensure UTF-8 output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# ============================================
# HELPER FUNCTIONS
# ============================================
function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "===> $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Gray
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Test-PortInUse {
    param([int]$PortNumber)
    try {
        $connection = Get-NetTCPConnection -LocalPort $PortNumber -ErrorAction SilentlyContinue
        return $null -ne $connection
    } catch {
        return $false
    }
}

function Stop-ProcessOnPort {
    param([int]$PortNumber)
    try {
        $connections = Get-NetTCPConnection -LocalPort $PortNumber -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                if ($process -and $process.Name -ne "System" -and $process.Name -ne "Idle") {
                    Write-Info "Stopping $($process.Name) on port $PortNumber..."
                    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                }
            }
            Start-Sleep -Seconds 1
        }
    } catch {
        # Ignore errors
    }
}

function Wait-ForPort {
    param([int]$PortNumber, [int]$TimeoutSeconds = 60)

    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $tcpClient.Connect("127.0.0.1", $PortNumber)
            $tcpClient.Close()
            $tcpClient.Dispose()
            return $true
        } catch {
            Start-Sleep -Seconds 1
            $elapsed++
        }
    }
    return $false
}

function Get-LocalIPAddress {
    try {
        $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.InterfaceAlias -notmatch "Loopback" -and
                $_.IPAddress -notmatch "^127\." -and
                $_.IPAddress -notmatch "^169\.254\."
            } |
            Select-Object -First 1 -ExpandProperty IPAddress

        if ($ip) { return $ip }
        return "localhost"
    } catch {
        return "localhost"
    }
}

function Install-Chocolatey {
    if (-not (Test-Command "choco")) {
        Write-Info "Installing Chocolatey package manager..."
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        if (Test-Command "choco") {
            Write-Success "Chocolatey installed"
            return $true
        } else {
            Write-Error "Failed to install Chocolatey"
            return $false
        }
    }
    Write-Success "Chocolatey already installed"
    return $true
}

function Install-NodeJS {
    if (Test-Command "node") {
        $nodeVersion = node --version 2>&1
        $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($versionNumber -ge 18) {
            Write-Success "Node.js $nodeVersion already installed"
            return $true
        }
        Write-Warning "Node.js $nodeVersion is outdated, upgrading..."
    }

    Write-Info "Installing Node.js $NODE_VERSION..."
    choco install nodejs-lts -y --force 2>&1 | Out-Null

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    if (Test-Command "node") {
        $nodeVersion = node --version 2>&1
        Write-Success "Node.js $nodeVersion installed"
        return $true
    } else {
        Write-Error "Failed to install Node.js"
        return $false
    }
}

function Install-DockerDesktop {
    # Check if Docker is installed
    if (Test-Command "docker") {
        # Check if Docker daemon is running
        $dockerRunning = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker Desktop already installed and running"
            return $true
        } else {
            Write-Warning "Docker is installed but not running"
            Write-Info "Starting Docker Desktop..."

            # Try to start Docker Desktop
            $dockerPath = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
            if (Test-Path $dockerPath) {
                Start-Process $dockerPath
                Write-Info "Waiting for Docker to start (this may take up to 2 minutes)..."

                $timeout = 120
                $elapsed = 0
                while ($elapsed -lt $timeout) {
                    Start-Sleep -Seconds 5
                    $elapsed += 5
                    $dockerCheck = docker info 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-Success "Docker Desktop started"
                        return $true
                    }
                    Write-Host "." -NoNewline
                }
                Write-Host ""
                Write-Error "Docker Desktop failed to start in time"
                Write-Info "Please start Docker Desktop manually and run this script again"
                return $false
            }
        }
    }

    Write-Info "Installing Docker Desktop..."
    Write-Warning "This will require a system restart after installation"

    choco install docker-desktop -y 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker Desktop installed"
        Write-Warning "Please restart your computer, then run this script again"
        Write-Info "After restart, make sure Docker Desktop is running before launching the script"

        $restart = Read-Host "Do you want to restart now? (y/n)"
        if ($restart -eq "y" -or $restart -eq "Y") {
            Restart-Computer -Force
        }
        exit 0
    } else {
        Write-Error "Failed to install Docker Desktop"
        Write-Info "Please install manually from: https://www.docker.com/products/docker-desktop/"
        return $false
    }
}

function Install-Git {
    if (Test-Command "git") {
        $gitVersion = git --version 2>&1
        Write-Success "Git already installed ($gitVersion)"
        return $true
    }

    Write-Info "Installing Git..."
    choco install git -y 2>&1 | Out-Null

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    if (Test-Command "git") {
        Write-Success "Git installed"
        return $true
    } else {
        Write-Error "Failed to install Git"
        return $false
    }
}

# ============================================
# HELP
# ============================================
if ($Help) {
    Write-Host ""
    Write-Host "PM - Gestion de Projets - Complete Setup Script" -ForegroundColor Blue
    Write-Host "================================================" -ForegroundColor Blue
    Write-Host ""
    Write-Host "This script automatically installs and configures everything needed:"
    Write-Host "  - Chocolatey (Windows package manager)"
    Write-Host "  - Node.js 20 LTS"
    Write-Host "  - Docker Desktop"
    Write-Host "  - Git"
    Write-Host "  - npm dependencies"
    Write-Host "  - MongoDB (via Docker)"
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\start-dev-docker.ps1              # Full setup and start"
    Write-Host "  .\start-dev-docker.ps1 -SkipInstall # Skip dependency installation"
    Write-Host "  .\start-dev-docker.ps1 -Port 27018  # Use custom MongoDB port"
    Write-Host "  .\start-dev-docker.ps1 -Help        # Show this help"
    Write-Host ""
    Write-Host "Note: Must be run as Administrator" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

# ============================================
# MAIN SCRIPT
# ============================================
Clear-Host
Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  PM - Gestion de Projets" -ForegroundColor Blue
Write-Host "  Complete Setup & Startup Script" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Change to project root
try {
    Set-Location $ProjectRoot -ErrorAction Stop
    Write-Success "Project directory: $ProjectRoot"
} catch {
    Write-Error "Cannot access project directory: $ProjectRoot"
    exit 1
}

# ============================================
# STEP 1: Install Dependencies
# ============================================
if (-not $SkipInstall) {
    Write-Step "Installing required software..."

    # Install Chocolatey
    if (-not (Install-Chocolatey)) {
        Write-Error "Cannot continue without Chocolatey"
        exit 1
    }

    # Install Git
    if (-not (Install-Git)) {
        Write-Warning "Git installation failed, continuing anyway..."
    }

    # Install Node.js
    if (-not (Install-NodeJS)) {
        Write-Error "Cannot continue without Node.js"
        exit 1
    }

    # Install Docker Desktop
    if (-not (Install-DockerDesktop)) {
        Write-Error "Cannot continue without Docker"
        exit 1
    }
} else {
    Write-Info "Skipping software installation (-SkipInstall flag)"
}

# ============================================
# STEP 2: Verify All Dependencies
# ============================================
Write-Step "Verifying dependencies..."

# Verify Node.js
Write-Host "Node.js: " -NoNewline
if (Test-Command "node") {
    $nodeVersion = node --version 2>&1
    Write-Success $nodeVersion
} else {
    Write-Error "Not found"
    exit 1
}

# Verify npm
Write-Host "npm: " -NoNewline
if (Test-Command "npm") {
    $npmVersion = npm --version 2>&1
    Write-Success "v$npmVersion"
} else {
    Write-Error "Not found"
    exit 1
}

# Verify Docker
Write-Host "Docker: " -NoNewline
if (Test-Command "docker") {
    $dockerCheck = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Running"
    } else {
        Write-Error "Not running"
        Write-Info "Please start Docker Desktop and run this script again"
        exit 1
    }
} else {
    Write-Error "Not found"
    exit 1
}

# Verify Docker Compose
Write-Host "Docker Compose: " -NoNewline
$composeCheck = docker compose version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Available"
} else {
    Write-Error "Not available"
    exit 1
}

# ============================================
# STEP 3: Free Up Ports
# ============================================
Write-Step "Checking and freeing ports..."

$portsToCheck = @(
    @{ Port = $Port; Name = "MongoDB" },
    @{ Port = 3000; Name = "Next.js" },
    @{ Port = 4000; Name = "Socket.io" }
)

foreach ($portInfo in $portsToCheck) {
    Write-Host "Port $($portInfo.Port) ($($portInfo.Name)): " -NoNewline

    if (Test-PortInUse $portInfo.Port) {
        Write-Host "In use - freeing... " -NoNewline -ForegroundColor Yellow
        Stop-ProcessOnPort $portInfo.Port

        if (Test-PortInUse $portInfo.Port) {
            Write-Error "Could not free port"
            Write-Info "Please manually close the application using port $($portInfo.Port)"
            exit 1
        } else {
            Write-Success "Freed"
        }
    } else {
        Write-Success "Available"
    }
}

# ============================================
# STEP 4: Clean Previous State
# ============================================
Write-Step "Cleaning previous state..."

# Stop existing Docker containers
Write-Host "Stopping existing containers... " -NoNewline
docker compose down 2>$null | Out-Null
Write-Success "Done"

# Clean corrupted Next.js cache
if (Test-Path ".next") {
    $shouldClean = $false

    if (Test-Path ".next/.build-lock") { $shouldClean = $true }
    elseif (-not (Test-Path ".next/BUILD_ID")) { $shouldClean = $true }
    elseif (Test-Path ".next/cache/.corrupted") { $shouldClean = $true }

    if ($shouldClean) {
        Write-Host "Cleaning corrupted Next.js cache... " -NoNewline
        Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
        Write-Success "Done"
    }
}

# Clean node_modules cache
if (Test-Path "node_modules/.cache") {
    Write-Host "Cleaning node_modules cache... " -NoNewline
    Remove-Item -Recurse -Force "node_modules/.cache" -ErrorAction SilentlyContinue
    Write-Success "Done"
}

# ============================================
# STEP 5: Setup Environment File
# ============================================
Write-Step "Setting up environment..."

if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file... " -NoNewline

    # Generate secure random JWT secret
    $randomBytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($randomBytes)
    $jwtSecret = [Convert]::ToBase64String($randomBytes)
    $rng.Dispose()

    $envContent = @"
# ================================================
# PM - Gestion de Projets - Configuration
# ================================================

# MongoDB Connection (Docker)
MONGO_URL=mongodb://admin:admin123@localhost:$Port/project-manager?authSource=admin

# JWT Secret (Auto-generated - Change in production!)
JWT_SECRET=$jwtSecret

# Builder API (Optional)
NEXT_PUBLIC_BUILDER_API_KEY=

# Node Environment
NODE_ENV=development

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Socket.io Configuration
SOCKET_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_SERVER_URL=http://localhost:4000
SOCKET_PORT=4000

# CORS Configuration
CORS_ORIGINS=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
"@

    # Write with UTF-8 encoding without BOM
    [System.IO.File]::WriteAllText("$ProjectRoot\.env", $envContent, [System.Text.UTF8Encoding]::new($false))
    Write-Success "Created"
} else {
    Write-Host "Environment file: " -NoNewline
    Write-Success "Already exists"
}

# ============================================
# STEP 6: Install npm Dependencies
# ============================================
Write-Step "Installing npm dependencies..."

if (-not (Test-Path "node_modules") -or -not (Test-Path "node_modules\.package-lock.json")) {
    Write-Info "This may take a few minutes on first run..."

    # Clean install to avoid issues
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
    }

    npm install 2>&1 | ForEach-Object {
        if ($_ -match "added|removed|packages") {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        Write-Info "Try running 'npm install' manually"
        exit 1
    }
    Write-Success "Dependencies installed"
} else {
    Write-Host "npm dependencies: " -NoNewline
    Write-Success "Already installed"
}

# ============================================
# STEP 7: Start MongoDB (Docker)
# ============================================
Write-Step "Starting MongoDB..."

$env:MONGODB_PORT = $Port

Write-Host "Starting MongoDB container... " -NoNewline
docker compose up -d mongodb 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start MongoDB"
    Write-Info "Try running: docker compose logs mongodb"
    exit 1
}
Write-Success "Started"

Write-Host "Waiting for MongoDB to be ready... " -NoNewline
if (Wait-ForPort -PortNumber $Port -TimeoutSeconds 60) {
    Write-Success "Ready"
} else {
    Write-Error "MongoDB did not start in time"
    Write-Info "Check logs with: docker compose logs mongodb"
    exit 1
}

# ============================================
# STEP 8: Configure Windows Firewall
# ============================================
Write-Step "Configuring Windows Firewall..."

$firewallRules = @(
    @{ Name = "PM-Gestion-NextJS"; Port = 3000 },
    @{ Name = "PM-Gestion-Socket"; Port = 4000 }
)

foreach ($rule in $firewallRules) {
    $existingRule = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
    if (-not $existingRule) {
        Write-Host "Creating firewall rule for port $($rule.Port)... " -NoNewline
        New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -Protocol TCP -LocalPort $rule.Port -Action Allow | Out-Null
        Write-Success "Created"
    } else {
        Write-Host "Firewall rule for port $($rule.Port): " -NoNewline
        Write-Success "Already exists"
    }
}

# ============================================
# STEP 9: Display Info & Start Application
# ============================================
$localIP = Get-LocalIPAddress

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete! Starting Application" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Local URL:     " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Network URL:   " -NoNewline -ForegroundColor White
Write-Host "http://${localIP}:3000" -ForegroundColor Cyan
Write-Host "  MongoDB:       " -NoNewline -ForegroundColor White
Write-Host "localhost:$Port" -ForegroundColor Cyan
Write-Host "  Socket.io:     " -NoNewline -ForegroundColor White
Write-Host "http://localhost:4000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  Application Logs" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Start the application
try {
    npm run dev:socket
} finally {
    # Cleanup on exit
    Write-Host ""
    Write-Host "Shutting down services..." -ForegroundColor Yellow

    # Stop Docker containers
    docker compose down 2>$null | Out-Null

    Write-Success "All services stopped"
}
