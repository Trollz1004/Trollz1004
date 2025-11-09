@echo off
REM Team Claude Dashboard - Quick Start ALL
REM Opens all URLs and starts local server
REM 50%% to Shriners Children's Hospitals

color 0A
title Team Claude - Quick Start ALL Services

echo.
echo ============================================================
echo          TEAM CLAUDE FOR THE KIDS
echo          Quick Start - ALL Services
echo ============================================================
echo.
echo  This will:
echo   1. Open youandinotai.com
echo   2. Open dashboard.youandinotai.com
echo   3. Start local development server on port 8000
echo.
echo ============================================================
echo.

REM Get directories
set SCRIPT_DIR=%~dp0
set DASHBOARD_DIR=%SCRIPT_DIR%team-claude-dashboard-deploy

echo [STEP 1/3] Opening platform URLs...
start https://youandinotai.com
timeout /t 1 >nul
start https://www.youandinotai.com
timeout /t 1 >nul
start https://dashboard.youandinotai.com
echo   [OK] URLs opened!
echo.

echo [STEP 2/3] Checking dashboard directory...
if not exist "%DASHBOARD_DIR%" (
    echo   [ERROR] Dashboard directory not found!
    pause
    exit /b 1
)
echo   [OK] Dashboard found!
echo.

echo [STEP 3/3] Starting local development server...
cd /d "%DASHBOARD_DIR%"

where python >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo   [OK] Python found! Starting server...
    echo.
    echo   Dashboard URL: http://localhost:8000
    echo   Press Ctrl+C to stop the server
    echo.
    timeout /t 2 >nul
    start http://localhost:8000
    echo.
    python -m http.server 8000
) else (
    echo   [ERROR] Python not found!
    echo   Please install Python to run local server.
    pause
)
