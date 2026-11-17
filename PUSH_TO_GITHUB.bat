@echo off
title Push AuRA_AuDTEX to GitHub Pages
cd /d "%~dp0"
echo ====================================================================
echo   Pushing AuRA_AuDTEX to https://github.com/aurae40/aura-audtex.git
echo ====================================================================
echo.
git branch -M main
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ====================================================================
    echo   SUCCESS! Your code is now live on GitHub.
    echo   Next step:
    echo   1. Go to: https://github.com/aurae40/aura-audtex/settings/pages
    echo   2. Under 'Source', select 'GitHub Actions'
    echo   3. Your permanent 24/7 URL will be:
    echo      https://aurae40.github.io/aura-audtex/
    echo ====================================================================
) else (
    echo.
    echo   [!] Push encountered an issue. Make sure you clicked 'Create repository'
    echo       on GitHub first, then run this file again.
)
echo.
pause
