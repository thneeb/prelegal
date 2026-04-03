$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Set-Location $ProjectDir

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop/"
    exit 1
}

try {
    docker info | Out-Null
} catch {
    Write-Error "Docker daemon is not running. Start Docker Desktop and try again."
    exit 1
}

Write-Host "Building and starting Prelegal..."
docker compose up --build -d

Write-Host ""
Write-Host "Prelegal is running at http://localhost:8000"
