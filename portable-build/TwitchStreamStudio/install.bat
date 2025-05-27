@echo off
title Twitch Stream Studio - Easy Installer
color 0A

echo ================================================================
echo   TWITCH STREAM STUDIO - PORTABLE INSTALLER
echo ================================================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo This installer requires administrator privileges.
    echo Please right-click and "Run as administrator"
    pause
    exit /b 1
)

echo [1/4] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python not found. Installing Python 3.11...
    
    REM Download Python installer (you'd need to include this or download it)
    echo Please manually install Python 3.11 from https://python.org
    echo Make sure to check "Add Python to PATH" during installation
    start https://python.org/downloads/
    echo.
    echo Press any key after installing Python...
    pause
)

echo [2/4] Checking FFmpeg...
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo FFmpeg not found. 
    echo.
    echo Option 1: Download from https://ffmpeg.org/download.html
    echo Option 2: Continue without FFmpeg (streaming won't work)
    echo.
    choice /c YN /m "Download FFmpeg now (Y/N)?"
    if errorlevel 2 goto skip_ffmpeg
    start https://ffmpeg.org/download.html
    echo.
    echo Install FFmpeg and add it to your PATH, then press any key...
    pause
)

:skip_ffmpeg
echo [3/4] Setting up application...
cd backend
echo Installing Python dependencies...
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
cd ..

echo [4/4] Creating desktop shortcut...
set SCRIPT_DIR=%~dp0
set SHORTCUT_PATH=%USERPROFILE%\Desktop\Twitch Stream Studio.lnk

REM Create shortcut (requires PowerShell)
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%SCRIPT_DIR%start.bat'; $Shortcut.WorkingDirectory = '%SCRIPT_DIR%'; $Shortcut.Save()"

echo.
echo ================================================================
echo   INSTALLATION COMPLETE!
echo ================================================================
echo.
echo Desktop shortcut created: "Twitch Stream Studio"
echo.
echo To start manually: Double-click start.bat
echo Web interface will open at: http://localhost:3000
echo.
echo Next steps:
echo 1. Get Twitch credentials from: https://dev.twitch.tv/console/apps
echo 2. Click the shortcut to start the app
echo 3. Enter your credentials in settings
echo 4. Start streaming!
echo.
pause