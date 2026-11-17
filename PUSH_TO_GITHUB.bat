@echo off
title Push AuRA_AuDTEX to GitHub Root Domain
cd /d "%~dp0"
echo ====================================================================
echo   Pushing AuRA_AuDTEX to https://github.com/aurae40/aurae40.github.io.git
echo ====================================================================
echo.
git branch -M main
git remote set-url origin https://github.com/aurae40/aurae40.github.io.git 2>nul || git remote add origin https://github.com/aurae40/aurae40.github.io.git
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ====================================================================
    echo   SUCCESS! Your code is now live on GitHub.
    echo   Next step:
    echo   1. Go to: https://github.com/aurae40/aurae40.github.io/settings/pages
    echo   2. Under 'Source', select 'GitHub Actions'
    echo   3. Your permanent 24/7 Root URL will be:
    echo      https://aurae40.github.io
    echo ====================================================================
) else (
    echo.
    echo   [!] If push failed, make sure you renamed the repository to aurae40.github.io on GitHub.
)
echo.
pause
