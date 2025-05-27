from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import asyncio
import aiohttp
import json
import subprocess
import tempfile
import logging
from typing import Optional, Dict, Any
import uuid

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Twitch Stream API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active streams and sessions
active_streams: Dict[str, Dict[str, Any]] = {}
websocket_connections: Dict[str, WebSocket] = {}

# Pydantic models
class TwitchCredentials(BaseModel):
    clientId: str
    clientSecret: str
    streamKey: Optional[str] = None

class StreamConfig(BaseModel):
    width: int = 1920
    height: int = 1080
    frameRate: int = 30
    bitrate: int = 2500

class StartStreamRequest(BaseModel):
    credentials: TwitchCredentials
    streamConfig: StreamConfig

class StreamResponse(BaseModel):
    success: bool
    message: str
    error: Optional[str] = None
    streamUrl: Optional[str] = None

# Twitch API endpoints
TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token"
TWITCH_VALIDATE_URL = "https://id.twitch.tv/oauth2/validate"
TWITCH_STREAMS_URL = "https://api.twitch.tv/helix/streams/key"
TWITCH_USERS_URL = "https://api.twitch.tv/helix/users"

async def get_twitch_access_token(client_id: str, client_secret: str) -> Optional[str]:
    """Get Twitch access token using client credentials flow"""
    try:
        async with aiohttp.ClientSession() as session:
            data = {
                'client_id': client_id,
                'client_secret': client_secret,
                'grant_type': 'client_credentials'
            }
            
            async with session.post(TWITCH_TOKEN_URL, data=data) as response:
                if response.status == 200:
                    result = await response.json()
                    return result.get('access_token')
                else:
                    logger.error(f"Failed to get access token: {response.status}")
                    return None
    except Exception as e:
        logger.error(f"Error getting access token: {e}")
        return None

async def validate_twitch_credentials(client_id: str, client_secret: str) -> bool:
    """Validate Twitch credentials"""
    try:
        access_token = await get_twitch_access_token(client_id, client_secret)
        if not access_token:
            return False
            
        async with aiohttp.ClientSession() as session:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Client-Id': client_id
            }
            
            async with session.get(TWITCH_VALIDATE_URL, headers=headers) as response:
                return response.status == 200
    except Exception as e:
        logger.error(f"Error validating credentials: {e}")
        return False

async def get_user_stream_key(client_id: str, access_token: str, broadcaster_id: str) -> Optional[str]:
    """Get user's stream key from Twitch API"""
    try:
        async with aiohttp.ClientSession() as session:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Client-Id': client_id
            }
            
            params = {'broadcaster_id': broadcaster_id}
            
            async with session.get(TWITCH_STREAMS_URL, headers=headers, params=params) as response:
                if response.status == 200:
                    result = await response.json()
                    if result.get('data'):
                        return result['data'][0].get('stream_key')
                return None
    except Exception as e:
        logger.error(f"Error getting stream key: {e}")
        return None

def start_rtmp_stream(stream_key: str, config: StreamConfig) -> subprocess.Popen:
    """Start RTMP stream using FFmpeg"""
    rtmp_url = f"rtmp://live.twitch.tv/live/{stream_key}"
    
    # FFmpeg command for streaming
    cmd = [
        'ffmpeg',
        '-f', 'lavfi',
        '-i', f'testsrc=size={config.width}x{config.height}:rate={config.frameRate}',
        '-f', 'lavfi',
        '-i', 'sine=frequency=1000:sample_rate=48000',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-b:v', f'{config.bitrate}k',
        '-maxrate', f'{config.bitrate}k',
        '-bufsize', f'{config.bitrate * 2}k',
        '-pix_fmt', 'yuv420p',
        '-g', str(config.frameRate * 2),
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '48000',
        '-f', 'flv',
        rtmp_url
    ]
    
    try:
        # Start FFmpeg process
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.PIPE
        )
        logger.info(f"Started RTMP stream with PID: {process.pid}")
        return process
    except Exception as e:
        logger.error(f"Failed to start RTMP stream: {e}")
        raise

@app.post("/api/auth/validate")
async def validate_credentials(credentials: TwitchCredentials):
    """Validate Twitch credentials"""
    try:
        is_valid = await validate_twitch_credentials(
            credentials.clientId, 
            credentials.clientSecret
        )
        
        if is_valid:
            return {"valid": True, "message": "Credentials are valid"}
        else:
            return {"valid": False, "error": "Invalid credentials"}
            
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return {"valid": False, "error": str(e)}

@app.post("/api/stream/start")
async def start_stream(request: StartStreamRequest):
    """Start streaming to Twitch"""
    try:
        session_id = str(uuid.uuid4())
        
        # Validate credentials first
        is_valid = await validate_twitch_credentials(
            request.credentials.clientId,
            request.credentials.clientSecret
        )
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid Twitch credentials")
        
        # Use provided stream key or get from API
        stream_key = request.credentials.streamKey
        if not stream_key:
            # For demo purposes, we'll use a test stream key
            # In production, you'd get this from Twitch API
            stream_key = "test_stream_key"
            logger.warning("Using test stream key - replace with actual Twitch API call")
        
        # Start RTMP stream
        try:
            process = start_rtmp_stream(stream_key, request.streamConfig)
            
            # Store active stream info
            active_streams[session_id] = {
                'process': process,
                'stream_key': stream_key,
                'config': request.streamConfig.dict(),
                'status': 'active'
            }
            
            logger.info(f"Stream started successfully - Session: {session_id}")
            
            return StreamResponse(
                success=True,
                message="Stream started successfully",
                streamUrl=f"https://twitch.tv"  # This would be the actual stream URL
            )
            
        except Exception as e:
            logger.error(f"Failed to start stream: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to start stream: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error starting stream: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stream/stop")
async def stop_stream():
    """Stop all active streams"""
    try:
        stopped_count = 0
        
        for session_id, stream_info in list(active_streams.items()):
            try:
                process = stream_info.get('process')
                if process and process.poll() is None:
                    process.terminate()
                    # Wait for process to terminate
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                    
                stopped_count += 1
                logger.info(f"Stopped stream - Session: {session_id}")
                
            except Exception as e:
                logger.error(f"Error stopping stream {session_id}: {e}")
            
            finally:
                # Remove from active streams
                active_streams.pop(session_id, None)
        
        return StreamResponse(
            success=True,
            message=f"Stopped {stopped_count} active stream(s)"
        )
        
    except Exception as e:
        logger.error(f"Error stopping streams: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stream/status")
async def get_stream_status():
    """Get current stream status"""
    try:
        active_count = 0
        stream_details = []
        
        for session_id, stream_info in list(active_streams.items()):
            process = stream_info.get('process')
            if process and process.poll() is None:
                active_count += 1
                stream_details.append({
                    'session_id': session_id,
                    'status': 'active',
                    'config': stream_info.get('config', {})
                })
            else:
                # Clean up finished streams
                active_streams.pop(session_id, None)
        
        return {
            "active_streams": active_count,
            "streams": stream_details,
            "total_sessions": len(active_streams)
        }
        
    except Exception as e:
        logger.error(f"Error getting stream status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/api/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time stream updates"""
    await websocket.accept()
    
    connection_id = str(uuid.uuid4())
    websocket_connections[connection_id] = websocket
    
    try:
        while True:
            # Send periodic status updates
            status = await get_stream_status()
            await websocket.send_json({
                "type": "status_update",
                "data": status
            })
            
            # Wait for 5 seconds before next update
            await asyncio.sleep(5)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        websocket_connections.pop(connection_id, None)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "active_streams": len(active_streams),
        "websocket_connections": len(websocket_connections)
    }

@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    logger.info("Twitch Stream API server starting up...")
    
    # Check if FFmpeg is available
    try:
        subprocess.run(['ffmpeg', '-version'], 
                      capture_output=True, 
                      check=True, 
                      timeout=10)
        logger.info("FFmpeg is available")
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        logger.warning("FFmpeg not found - streaming functionality may be limited")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    logger.info("Shutting down - stopping all active streams...")
    
    # Stop all active streams
    for session_id, stream_info in active_streams.items():
        try:
            process = stream_info.get('process')
            if process and process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                logger.info(f"Stopped stream on shutdown - Session: {session_id}")
        except Exception as e:
            logger.error(f"Error stopping stream {session_id} on shutdown: {e}")
    
    active_streams.clear()
    websocket_connections.clear()
    logger.info("Shutdown complete")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)