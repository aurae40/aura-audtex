@echo off
title AuRA_AuDTEX Local Transcriber Server
echo ======================================================
echo   AuRA_AuDTEX Local Speech-to-Text Transcriber Server
echo ======================================================
echo.

python -m pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [Warning] Some dependencies failed to install. Starting fallback server...
)

echo Starting Local Transcriber on http://localhost:8000 ...
python server.py
pause
