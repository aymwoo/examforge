<#
ExamForge one-click prod start (CN mirrors)

Usage:
  powershell -ExecutionPolicy Bypass -File .\scripts\start-prod-cn.ps1 [-NoBuild] [-NoUp] [-SkipMirror] [-Logs]

Default behavior:
  - Enable common China mirrors (npmmirror)
  - Ensure docker/.env exists (copy from docker/.env.example if missing)
  - docker compose up -d --build using docker/docker-compose.yml
#>

[CmdletBinding()]
param(
  [switch]$NoBuild,
  [switch]$NoUp,
  [switch]$SkipMirror,
  [switch]$Logs
)

$ErrorActionPreference = 'Stop'

function Require-Cmd([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

function Ensure-Pnpm {
  if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    return
  }

  Write-Host "pnpm not found; installing via npm..."
  Require-Cmd npm
  npm install -g pnpm

  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw 'Failed to install pnpm. Please run: npm install -g pnpm'
  }
}

function Maybe-SetEnv([string]$Key, [string]$Value) {
  $current = [System.Environment]::GetEnvironmentVariable($Key)
  if ([string]::IsNullOrWhiteSpace($current)) {
    [System.Environment]::SetEnvironmentVariable($Key, $Value)
    $env:$Key = $Value
  }
}

function Docker-MirrorHint {
  $daemonJson = '/etc/docker/daemon.json'
  if (Test-Path $daemonJson) {
    try {
      $content = Get-Content $daemonJson -Raw
      if ($content -notmatch 'registry-mirrors') {
        Write-Host "[hint] Docker registry mirror not found in $daemonJson"
        Write-Host "       Consider configuring registry-mirrors for faster pulls in China."
      }
    } catch {
      Write-Host "[hint] Cannot read /etc/docker/daemon.json; skipping docker mirror check."
    }
  }
}

$RootDir = Resolve-Path (Join-Path $PSScriptRoot '..')
$ComposeFile = Join-Path $RootDir 'docker/docker-compose.yml'
$EnvExample = Join-Path $RootDir 'docker/.env.example'
$EnvFile = Join-Path $RootDir 'docker/.env'

Require-Cmd docker
Ensure-Pnpm
if (-not (Test-Path $ComposeFile)) {
  throw "Compose file not found: $ComposeFile"
}

# Determine docker compose command
$UseDockerComposeV2 = $false
try {
  docker compose version | Out-Null
  $UseDockerComposeV2 = $true
} catch {
  $UseDockerComposeV2 = $false
}

if (-not $SkipMirror) {
  Maybe-SetEnv 'NPM_CONFIG_REGISTRY' 'https://registry.npmmirror.com'
  Maybe-SetEnv 'PNPM_REGISTRY' 'https://registry.npmmirror.com'

  Maybe-SetEnv 'NODEJS_ORG_MIRROR' 'https://npmmirror.com/mirrors/node/'
  Maybe-SetEnv 'ELECTRON_MIRROR' 'https://npmmirror.com/mirrors/electron/'
  Maybe-SetEnv 'SASS_BINARY_SITE' 'https://npmmirror.com/mirrors/node-sass/'
  Maybe-SetEnv 'PHANTOMJS_CDNURL' 'https://npmmirror.com/mirrors/phantomjs/'
  Maybe-SetEnv 'PUPPETEER_DOWNLOAD_HOST' 'https://npmmirror.com/mirrors/'
  Maybe-SetEnv 'PLAYWRIGHT_DOWNLOAD_HOST' 'https://npmmirror.com/mirrors/playwright/'
}

Docker-MirrorHint

if (-not (Test-Path $EnvFile)) {
  if (Test-Path $EnvExample) {
    Copy-Item $EnvExample $EnvFile
    Write-Host "Created docker/.env from docker/.env.example"
    Write-Host "[important] Please edit docker/.env and set JWT_SECRET and LLM_API_KEY."
  } else {
    throw "Missing env example: $EnvExample"
  }
}

if ($NoUp) {
  Write-Host "Checks completed (-NoUp)."
  exit 0
}

$upArgs = @('-f', $ComposeFile, '--env-file', $EnvFile, 'up', '-d')
if (-not $NoBuild) {
  $upArgs += '--build'
}

Push-Location $RootDir
try {
  if ($UseDockerComposeV2) {
    Write-Host "Running: docker compose $($upArgs -join ' ')"
    docker compose @upArgs
  } else {
    Require-Cmd docker-compose
    Write-Host "Running: docker-compose $($upArgs -join ' ')"
    docker-compose @upArgs
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Services started."
Write-Host "- Web: http://localhost"
Write-Host "- API: http://localhost:3000"
Write-Host ""
Write-Host "Logs: docker compose -f docker/docker-compose.yml --env-file docker/.env logs -f --tail=200"

if ($Logs) {
  Push-Location $RootDir
  try {
    if ($UseDockerComposeV2) {
      docker compose -f docker/docker-compose.yml --env-file docker/.env logs -f --tail=200
    } else {
      docker-compose -f docker/docker-compose.yml --env-file docker/.env logs -f --tail=200
    }
  } finally {
    Pop-Location
  }
}
