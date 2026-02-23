@echo off
REM OpenClaw Bridge Runner for Windows
REM This script runs the bridge that connects OpenClaw to local OpenCode

SET BRIDGE_DIR=%~dp0
cd /d "%BRIDGE_DIR%"

echo Installing dependencies...
call npm install

echo.
echo Starting OpenClaw Bridge...
echo OpenClaw WS: ws://187.77.53.162:51798
echo OpenCode API: http://localhost:3000
echo.

SET OPENCLAW_WS_URL=ws://187.77.53.162:51798
SET OPENCODE_API_URL=http://localhost:3000

node index.js

pause
