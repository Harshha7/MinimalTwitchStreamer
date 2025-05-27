@echo off
title Twitch Stream Studio
echo Starting Twitch Stream Studio...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

REM Check if FFmpeg is installed
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: FFmpeg not found - streaming may not work
    echo Download from: https://ffmpeg.org/download.html
    echo.
)

REM Install dependencies if needed
if not exist backend\venv (
    echo Installing Python dependencies...
    cd backend
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
)

REM Start backend
echo Starting backend server...
cd backend
if exist venv\Scripts\activate (
    call venv\Scripts\activate
)
start /min python -m uvicorn server:app --host 127.0.0.1 --port 8001
cd ..

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend (serve the build folder)
echo Starting frontend...
python -m http.server 3000 -d frontend

echo.
echo Application started!
echo Open your browser to: http://localhost:3000
echo Close this window to stop the application.
pause
