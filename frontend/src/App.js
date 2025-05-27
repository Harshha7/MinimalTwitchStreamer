import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const App = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState('disconnected');
  const [showSettings, setShowSettings] = useState(false);
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: '',
    streamKey: ''
  });
  const [screenStream, setScreenStream] = useState(null);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  
  const videoRef = useRef(null);
  // Use localhost for Electron app
  const backendUrl = window.location.protocol === 'file:' 
    ? 'http://127.0.0.1:8001' 
    : (process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8001');

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), { message, type, timestamp }]);
  };

  useEffect(() => {
    addLog('Twitch Stream Studio started', 'success');
    
    // Test backend connection
    fetch(`${backendUrl}/api/health`)
      .then(response => response.json())
      .then(data => {
        if (data.status === 'healthy') {
          addLog('Backend connection established', 'success');
        }
      })
      .catch(err => {
        addLog('Backend connection failed - some features may not work', 'error');
      });
  }, [backendUrl]);

  const startScreenCapture = async () => {
    try {
      setError('');
      addLog('Requesting screen capture permission...', 'info');
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          logicalSurface: true,
          cursor: 'always',
          width: { min: 640, ideal: 1920, max: 1920 },
          height: { min: 480, ideal: 1080, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      setScreenStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      addLog('Screen capture started successfully', 'success');
      return stream;
    } catch (err) {
      const errorMsg = `Screen capture failed: ${err.message}`;
      setError(errorMsg);
      addLog(errorMsg, 'error');
      throw err;
    }
  };

  const stopScreenCapture = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      addLog('Screen capture stopped', 'info');
    }
  };

  const startStream = async () => {
    try {
      if (!credentials.clientId || !credentials.clientSecret) {
        setError('Please configure Twitch credentials in settings');
        addLog('Missing Twitch credentials', 'error');
        return;
      }

      setError('');
      addLog('Starting stream...', 'info');
      
      const stream = await startScreenCapture();
      
      // Send credentials and start streaming
      const response = await fetch(`${backendUrl}/api/stream/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials: credentials,
          streamConfig: {
            width: 1920,
            height: 1080,
            frameRate: 30,
            bitrate: 2500
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setIsStreaming(true);
        setStreamStatus('live');
        addLog('Stream started successfully! You are now live on Twitch!', 'success');
      } else {
        throw new Error(result.error || 'Failed to start stream');
      }
      
    } catch (err) {
      const errorMsg = `Stream start failed: ${err.message}`;
      setError(errorMsg);
      addLog(errorMsg, 'error');
      stopScreenCapture();
    }
  };

  const stopStream = async () => {
    try {
      addLog('Stopping stream...', 'info');
      
      const response = await fetch(`${backendUrl}/api/stream/stop`, {
        method: 'POST'
      });
      
      stopScreenCapture();
      setIsStreaming(false);
      setStreamStatus('disconnected');
      addLog('Stream stopped', 'info');
      
    } catch (err) {
      const errorMsg = `Stop stream failed: ${err.message}`;
      setError(errorMsg);
      addLog(errorMsg, 'error');
    }
  };

  const testCredentials = async () => {
    try {
      if (!credentials.clientId || !credentials.clientSecret) {
        setError('Please enter both Client ID and Client Secret');
        return;
      }

      addLog('Testing Twitch credentials...', 'info');
      
      const response = await fetch(`${backendUrl}/api/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      const result = await response.json();
      
      if (result.valid) {
        addLog('Credentials validated successfully!', 'success');
        setError('');
      } else {
        throw new Error(result.error || 'Invalid credentials');
      }
      
    } catch (err) {
      const errorMsg = `Credential validation failed: ${err.message}`;
      setError(errorMsg);
      addLog(errorMsg, 'error');
    }
  };

  const openTwitchDev = () => {
    // In Electron, this will open in external browser
    window.open('https://dev.twitch.tv/console/apps', '_blank');
  };

  const getStatusColor = () => {
    switch (streamStatus) {
      case 'live': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (streamStatus) {
      case 'live': return 'LIVE';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Error';
      default: return 'Offline';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-xl font-bold">Twitch Stream Studio</h1>
            </div>
            <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
              <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
          </div>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Preview */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Screen Preview</h2>
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-64 bg-gray-700 rounded-lg object-contain"
                />
                {!screenStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-700 rounded-lg">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-400">No screen capture active</p>
                      <p className="text-gray-500 text-sm mt-2">Click "Start Stream" to begin</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Stream Controls */}
              <div className="flex items-center justify-center space-x-4 mt-6">
                {!isStreaming ? (
                  <button
                    onClick={startStream}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    <span>Start Stream</span>
                  </button>
                ) : (
                  <button
                    onClick={stopStream}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                    <span>Stop Stream</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Twitch Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={credentials.clientId}
                      onChange={(e) => setCredentials(prev => ({...prev, clientId: e.target.value}))}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter Twitch Client ID"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      value={credentials.clientSecret}
                      onChange={(e) => setCredentials(prev => ({...prev, clientSecret: e.target.value}))}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter Twitch Client Secret"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Stream Key (Optional)
                    </label>
                    <input
                      type="password"
                      value={credentials.streamKey}
                      onChange={(e) => setCredentials(prev => ({...prev, streamKey: e.target.value}))}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Auto-fetch if empty"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={testCredentials}
                      className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Test Credentials
                    </button>
                    <button
                      onClick={openTwitchDev}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      title="Get Twitch Credentials"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-400 bg-gray-700 p-3 rounded">
                    <p className="font-medium mb-1">Need credentials?</p>
                    <p>1. Click the external link button above</p>
                    <p>2. Create a new app on Twitch Developer Console</p>
                    <p>3. Copy Client ID and Client Secret here</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}

            {/* Logs */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-400 text-sm">No activity yet</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <span className="text-gray-400 text-xs mt-0.5 w-16 flex-shrink-0">
                        {log.timestamp}
                      </span>
                      <span className={`flex-1 ${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'success' ? 'text-green-400' :
                        'text-gray-300'
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;