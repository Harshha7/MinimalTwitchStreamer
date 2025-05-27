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
