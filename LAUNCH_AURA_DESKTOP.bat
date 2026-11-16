@echo off
title AuRA_AuDTEX Local Speech Engine & UI Launcher
cd /d "%~dp0"
echo ==================================================================
echo   AuRA_AuDTEX - The Illuminated Audio Transcriber & Cognitive Vault
echo   Powered by State-of-the-Art Faster-Whisper Neural Speech AI
echo ==================================================================
echo.
echo [1/2] Starting Faster-Whisper Local Engine on port 8000 ...
start "AuRA_Transcriber_Backend" /min cmd /c "cd /d %~dp0backend && python server.py"

echo [2/2] Starting AuRA_AuDTEX UI on port 4173 ...
start "AuRA_Vite_UI" /min cmd /c "cd /d %~dp0 && npx vite preview --host 0.0.0.0 --port 4173"

timeout /t 3 /nobreak >nul
echo.
echo Opening AuRA_AuDTEX in your browser...
start "" "http://localhost:4173"
echo.
echo ==================================================================
echo   AuRA_AuDTEX is ACTIVE and RUNNING!
echo   - Local Desktop UI:       http://localhost:4173
echo   - Local Neural Backend:   http://localhost:8000
echo   - Multi-Device Wi-Fi:     Available on your local LAN IP
echo.
echo   For remote or mobile access across networks:
echo   Run cloudflared tunnel --url http://localhost:8000 and enter
echo   your tunnel URL in the Vault Library settings.
echo ==================================================================
pause
