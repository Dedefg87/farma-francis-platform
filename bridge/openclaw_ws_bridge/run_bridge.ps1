# OpenClaw Bridge Runner for PowerShell
# This script runs the bridge that connects OpenClaw to local OpenCode

$BridgeDir = $PSScriptRoot
Set-Location $BridgeDir

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "Starting OpenClaw Bridge..." -ForegroundColor Green
Write-Host "OpenClaw WS: ws://187.77.53.162:51798" -ForegroundColor Yellow
Write-Host "OpenCode API: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""

$env:OPENCLAW_WS_URL = "ws://187.77.53.162:51798"
$env:OPENCODE_API_URL = "http://localhost:3000"

node index.js
