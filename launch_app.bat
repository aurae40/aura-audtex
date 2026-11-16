@echo off
title AuRA_AuDTEX - Cognitive Audio Reader
echo Starting AuRA_AuDTEX Services...

:: 1. Ensure Python Faster-Whisper backend is running on port 8000
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %ERRORLEVEL% NEQ 0 (
    echo Starting Faster-Whisper engine on port 8000...
    start /min "AuRA Backend" cmd /c "cd /d D:\codex-audio\backend && python server.py"
)

:: 2. Ensure Vite preview server is running on port 4173
netstat -ano | findstr :4173 | findstr LISTENING >nul
if %ERRORLEVEL% NEQ 0 (
    echo Starting AuRA Web Server on port 4173...
    start /min "AuRA Server" cmd /c "cd /d D:\codex-audio && npx vite preview --host 0.0.0.0 --port 4173"
    timeout /t 2 /nobreak >nul
)

:: 3. Launch App Window in Microsoft Edge (App Mode) or Chrome
echo Launching AuRA_AuDTEX Desktop Window...
start msedge --app="http://localhost:4173" 2>nul
if %ERRORLEVEL% NEQ 0 (
    start chrome --app="http://localhost:4173" 2>nul
)
if %ERRORLEVEL% NEQ 0 (
    start http://localhost:4173
)
