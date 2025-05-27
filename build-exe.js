const builder = require('electron-builder');
const path = require('path');

async function buildApp() {
  try {
    console.log('Building Twitch Stream Studio executable...');
    
    // Build configuration
    const config = {
      appId: 'com.twitchstream.studio',
      productName: 'Twitch Stream Studio',
      directories: {
        output: 'dist'
      },
      files: [
        'electron/**/*',
        'frontend/build/**/*',
        'backend/**/*',
        'node_modules/**/*',
        '!backend/__pycache__',
        '!backend/.env',
        '!**/*.pyc',
        '!frontend/node_modules',
        '!frontend/src'
      ],
      win: {
        target: {
          target: 'nsis',
          arch: ['x64']
        }
      },
      nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: 'Twitch Stream Studio'
      },
      extraMetadata: {
        main: 'electron/main.js'
      }
    };

    // Build for Windows
    await builder.build({
      targets: builder.Platform.WINDOWS.createTarget(),
      config: config
    });

    console.log('✅ Build completed! Check the dist/ folder for your .exe file');
    console.log('The installer will be named something like "Twitch Stream Studio Setup 1.0.0.exe"');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildApp();