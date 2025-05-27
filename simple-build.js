const { execSync } = require('child_process');

console.log('Building Twitch Stream Studio executable...');

try {
  // Use the npm script directly
  execSync('npm run dist-win', { stdio: 'inherit', cwd: '/app' });
  console.log('✅ Build completed! Check the dist/ folder for your .exe file');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}