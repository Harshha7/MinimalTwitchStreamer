const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn, exec } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;

// Keep a global reference of the window object
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false, // Allow screen capture
      allowRunningInsecureContent: true
    },
    icon: path.join(__dirname, '../electron/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../frontend/build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Start the Python backend server
function startBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = isDev 
      ? path.join(__dirname, '..', 'backend')
      : path.join(process.resourcesPath, 'backend');
    
    console.log('Starting backend from:', backendPath);
    
    // Check if Python is available
    exec('python --version', (error, stdout, stderr) => {
      if (error) {
        console.error('Python not found, trying python3...');
        exec('python3 --version', (error2, stdout2, stderr2) => {
          if (error2) {
            dialog.showErrorBox(
              'Python Required', 
              'Python 3.8+ is required to run this application. Please install Python from python.org'
            );
            app.quit();
            return;
          }
          startPythonServer('python3', backendPath, resolve, reject);
        });
      } else {
        startPythonServer('python', backendPath, resolve, reject);
      }
    });
  });
}

function startPythonServer(pythonCmd, backendPath, resolve, reject) {
  const serverScript = path.join(backendPath, 'server.py');
  
  // Set environment variables
  const env = {
    ...process.env,
    PYTHONPATH: backendPath,
    PORT: '8001'
  };

  // Start the backend process
  backendProcess = spawn(pythonCmd, ['-m', 'uvicorn', 'server:app', '--host', '127.0.0.1', '--port', '8001'], {
    cwd: backendPath,
    env: env,
    stdio: 'pipe'
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
    if (data.includes('Uvicorn running on')) {
      resolve();
    }
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });

  backendProcess.on('error', (error) => {
    console.error('Failed to start backend:', error);
    reject(error);
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    resolve(); // Continue even if backend didn't start perfectly
  }, 10000);
}

// Check for FFmpeg
function checkFFmpeg() {
  return new Promise((resolve) => {
    exec('ffmpeg -version', (error, stdout, stderr) => {
      if (error) {
        console.warn('FFmpeg not found - streaming may not work');
        dialog.showMessageBox(mainWindow, {
          type: 'warning',
          title: 'FFmpeg Not Found',
          message: 'FFmpeg is required for streaming functionality. Please install FFmpeg for full functionality.',
          buttons: ['Continue Anyway', 'Download FFmpeg'],
          defaultId: 0
        }).then((result) => {
          if (result.response === 1) {
            shell.openExternal('https://ffmpeg.org/download.html');
          }
          resolve();
        });
      } else {
        console.log('FFmpeg found');
        resolve();
      }
    });
  });
}

// App event handlers
app.whenReady().then(async () => {
  try {
    console.log('Starting Twitch Stream Studio...');
    
    // Start backend server
    await startBackend();
    console.log('Backend started');
    
    // Check FFmpeg
    await checkFFmpeg();
    
    // Create main window
    createWindow();
    
    console.log('Application ready');
  } catch (error) {
    console.error('Failed to start application:', error);
    dialog.showErrorBox('Startup Error', `Failed to start the application: ${error.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // Stop backend process
  if (backendProcess) {
    backendProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  // Stop backend process
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Security
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Handle app certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});