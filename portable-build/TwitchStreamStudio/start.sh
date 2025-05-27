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
