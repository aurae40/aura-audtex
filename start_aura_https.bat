@echo off
title AuRA_AuDTEX Studio (HTTPS Mobile & Desktop Launcher)
echo ====================================================================
echo   AuRA_AuDTEX HTTPS Launcher (Unlocks Mic, Wake Lock & PWA on Phones)
echo ====================================================================
echo.

echo [1/2] Starting Faster-Whisper + Ollama Backend on http://127.0.0.1:8000 ...
start "AuRA Backend Server" cmd /k "cd /d %~dp0backend && python server.py"

timeout /t 3 /nobreak >nul

echo [2/2] Opening Encrypted HTTPS Tunnel for iPhone Safari & Android Chrome...
echo       Copy the https://*.trycloudflare.com URL below onto your phone!
echo.
if exist "%~dp0backend\cloudflared.exe" (
    "%~dp0backend\cloudflared.exe" tunnel --url http://127.0.0.1:8000
) else (
    cloudflared tunnel --url http://127.0.0.1:8000
)
pause
