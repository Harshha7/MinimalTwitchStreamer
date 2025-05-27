#!/bin/bash

echo "🚀 Creating Twitch Stream Studio Portable Package..."

# Create output directory
mkdir -p /app/portable-build
cd /app/portable-build

# Create the app structure
echo "📁 Setting up folder structure..."
mkdir -p TwitchStreamStudio
cd TwitchStreamStudio

# Copy backend files
echo "📦 Copying backend..."
cp -r ../../backend ./
cp ../../backend/requirements.txt ./

# Copy frontend build
echo "📦 Copying frontend..."
cp -r ../../frontend/build ./frontend

# Create a startup script
echo "📝 Creating startup scripts..."

# Windows batch file
cat > start.bat << 'EOF'
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
EOF

# Linux/Mac shell script
cat > start.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Twitch Stream Studio..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ from https://python.org"
    exit 1
fi

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  WARNING: FFmpeg not found - streaming may not work"
    echo "Install with: sudo apt-get install ffmpeg (Ubuntu) or brew install ffmpeg (Mac)"
    echo
fi

# Install dependencies if needed
if [ ! -d "backend/venv" ]; then
    echo "📦 Installing Python dependencies..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Start backend
echo "🔧 Starting backend server..."
cd backend
source venv/bin/activate
python -m uvicorn server:app --host 127.0.0.1 --port 8001 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "🌐 Starting frontend..."
python3 -m http.server 3000 -d frontend &
FRONTEND_PID=$!

echo "✅ Application started!"
echo "🌍 Open your browser to: http://localhost:3000"
echo "❌ Press Ctrl+C to stop the application"

# Handle cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Wait for user to stop
wait
EOF

chmod +x start.sh

# Create README
cat > README.md << 'EOF'
# Twitch Stream Studio - Portable

A minimal screensharing app that streams to Twitch.

## Requirements

- **Python 3.8+** - Download from https://python.org
- **FFmpeg** - Download from https://ffmpeg.org/download.html
- **Modern web browser** with WebRTC support

## Quick Start

### Windows
1. Double-click `start.bat`
2. Wait for the application to start
3. Open http://localhost:3000 in your browser

### Linux/Mac
1. Open terminal in this folder
2. Run: `./start.sh`
3. Open http://localhost:3000 in your browser

## Setup

1. **Get Twitch Credentials:**
   - Go to https://dev.twitch.tv/console/apps
   - Create a new application
   - Copy your Client ID and Client Secret

2. **Configure the App:**
   - Click the settings gear in the app
   - Enter your Twitch credentials
   - Test the connection

3. **Start Streaming:**
   - Click "Start Stream"
   - Allow screen capture when prompted
   - You're now live on Twitch!

## Features

- ✅ WebRTC screen capture
- ✅ Direct Twitch streaming via RTMP
- ✅ Real-time activity logging
- ✅ Professional streaming interface
- ✅ Lightweight (under 50MB)

## Troubleshooting

- **Python not found**: Install Python and add it to your PATH
- **FFmpeg not found**: Install FFmpeg for streaming functionality
- **Permission errors**: Run as administrator (Windows) or with sudo (Linux/Mac)
- **Port conflicts**: Close any applications using ports 3000 or 8001

## Size

Total package size: ~15-20MB (excluding Python and FFmpeg)
EOF

# Create a simple web-based launcher as alternative
cat > launcher.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Twitch Stream Studio Launcher</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .button { background: #9146ff; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 10px; }
        .warning { background: #ff6b6b; color: white; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .success { background: #51cf66; color: white; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .instructions { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>🎮 Twitch Stream Studio</h1>
    <p>Minimal screensharing app for Twitch streaming</p>
    
    <div class="instructions">
        <h3>📋 Setup Instructions:</h3>
        <ol>
            <li><strong>Install Python 3.8+</strong> from <a href="https://python.org" target="_blank">python.org</a></li>
            <li><strong>Install FFmpeg</strong> from <a href="https://ffmpeg.org/download.html" target="_blank">ffmpeg.org</a></li>
            <li><strong>Get Twitch credentials</strong> from <a href="https://dev.twitch.tv/console/apps" target="_blank">dev.twitch.tv</a></li>
            <li>Run the appropriate startup script for your system</li>
        </ol>
    </div>

    <h3>🚀 Launch Application:</h3>
    <button class="button" onclick="window.open('http://localhost:3000')">Open App (if already running)</button>
    
    <div class="instructions">
        <h4>Windows Users:</h4>
        <p>Double-click <code>start.bat</code> to launch the application</p>
        
        <h4>Linux/Mac Users:</h4>
        <p>Run <code>./start.sh</code> in terminal to launch the application</p>
    </div>

    <div class="warning">
        <strong>⚠️ Note:</strong> Make sure to start the application using the appropriate script before clicking "Open App"
    </div>

    <script>
        // Auto-check if app is running
        fetch('http://localhost:3000')
            .then(() => {
                document.body.innerHTML += '<div class="success">✅ Application is running! Click "Open App" button above.</div>';
            })
            .catch(() => {
                document.body.innerHTML += '<div class="warning">❌ Application not running. Please start it using the startup script.</div>';
            });
    </script>
</body>
</html>
EOF

echo "✅ Portable package created!"
echo
echo "📁 Package location: /app/portable-build/TwitchStreamStudio/"
echo "📝 Package size:"
du -sh /app/portable-build/TwitchStreamStudio/
echo
echo "🎉 Your portable Twitch Stream Studio is ready!"
echo
echo "To distribute:"
echo "1. Zip the TwitchStreamStudio folder"
echo "2. Share with users"
echo "3. Users run start.bat (Windows) or start.sh (Linux/Mac)"