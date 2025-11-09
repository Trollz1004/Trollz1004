@echo off
REM Team Claude Dashboard - 1-Click Launcher (Batch File)
REM Ai-Solutions.Store Platform
REM 50%% to Shriners Children's Hospitals

color 0A
title Team Claude Dashboard Launcher

echo.
echo ============================================================
echo.
echo           TEAM CLAUDE FOR THE KIDS
echo           Dashboard Launcher
echo           Ai-Solutions.Store Platform
echo           [HEART] 50%% to Shriners Children's Hospitals
echo.
echo ============================================================
echo.
echo.

REM Get script directory
set SCRIPT_DIR=%~dp0
set DASHBOARD_DIR=%SCRIPT_DIR%team-claude-dashboard-deploy

echo Script Directory: %SCRIPT_DIR%
echo Dashboard Directory: %DASHBOARD_DIR%
echo.

REM Check if dashboard directory exists
if not exist "%DASHBOARD_DIR%" (
    echo [ERROR] Dashboard directory not found!
    echo Expected: %DASHBOARD_DIR%
    echo.
    echo Please ensure you're running this from the Trollz1004 directory.
    echo.
    pause
    exit /b 1
)

echo ============================================================
echo           LAUNCHER MENU
echo ============================================================
echo.
echo   1] Deploy Dashboard to Netlify (Production)
echo   2] Open All Platform URLs
echo   3] Start Local Development Server
echo   4] View Charity Impact
echo   5] Open Dashboard Files in Explorer
echo   6] Exit
echo.
echo ============================================================
echo.

set /p choice="Enter choice [1-6]: "

if "%choice%"=="1" goto deploy
if "%choice%"=="2" goto openurls
if "%choice%"=="3" goto localserver
if "%choice%"=="4" goto charity
if "%choice%"=="5" goto explorer
if "%choice%"=="6" goto exit
goto invalid

:deploy
echo.
echo [DEPLOYING] Starting Netlify Deployment...
echo.
cd /d "%DASHBOARD_DIR%"

REM Check for bash (Git Bash or WSL)
where bash >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo Using bash to run deployment script...
    bash deploy-netlify.sh
) else (
    echo [WARNING] Bash not found. Manual deployment required.
    echo.
    echo Manual deployment steps:
    echo   1. Install Netlify CLI: npm install -g netlify-cli
    echo   2. Login: netlify login
    echo   3. Deploy: netlify deploy --prod --dir=.
    echo.
)
pause
goto menu

:openurls
echo.
echo [OPENING] Opening all platform URLs...
echo.
start https://youandinotai.com
timeout /t 1 >nul
start https://www.youandinotai.com
timeout /t 1 >nul
start https://dashboard.youandinotai.com
echo.
echo [SUCCESS] All URLs opened in your browser!
echo.
pause
goto menu

:localserver
echo.
echo [STARTING] Local Development Server...
echo.
cd /d "%DASHBOARD_DIR%"

REM Check for Python
where python >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo Starting Python HTTP server on port 8000...
    echo Dashboard will be available at: http://localhost:8000
    echo Press Ctrl+C to stop the server
    echo.
    timeout /t 2 >nul
    start http://localhost:8000
    python -m http.server 8000
) else (
    echo [ERROR] Python not found!
    echo Please install Python or use another HTTP server.
    echo.
)
pause
goto menu

:charity
echo.
echo ============================================================
echo           TEAM CLAUDE FOR THE KIDS
echo           Charity Impact
echo ============================================================
echo.
echo Mission:
echo   50%% of all profits go directly to Shriners Children's Hospitals
echo.
echo Impact:
echo   - Every subscription helps children receive world-class medical care
echo   - Every user brings us closer to our charity goals
echo   - 100%% transparent profit sharing
echo.
echo Platform Revenue Model:
echo   - 50%% to Shriners Children's Hospitals
echo   - 50%% to Platform operations and growth
echo.
echo Together, we're proving that technology and compassion
echo can change the world!
echo.
echo ============================================================
echo.
pause
goto menu

:explorer
echo.
echo [OPENING] Dashboard directory in Explorer...
explorer "%DASHBOARD_DIR%"
echo.
pause
goto menu

:invalid
echo.
echo [ERROR] Invalid choice. Please try again.
echo.
pause
goto menu

:exit
echo.
echo Thank you for using Team Claude Dashboard!
echo [HEART] 50%% to Shriners Children's Hospitals
echo.
exit /b 0

:menu
cls
goto top
