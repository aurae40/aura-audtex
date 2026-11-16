@echo off
cd /d D:\codex-audio

:: Check Python backend
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %ERRORLEVEL% NEQ 0 (
    start "" /b cmd /c "cd /d D:\codex-audio\backend && python server.py >nul 2>&1"
)

:: Check Vite preview server
netstat -ano | findstr :4173 | findstr LISTENING >nul
if %ERRORLEVEL% NEQ 0 (
    start "" /b cmd /c "cd /d D:\codex-audio && npx vite preview --host 0.0.0.0 --port 4173 >nul 2>&1"
)
