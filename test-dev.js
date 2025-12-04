const { spawn } = require('child_process');

console.log('Starting dev server...');
const dev = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  shell: true,
  stdio: 'inherit'
});

dev.on('error', (error) => {
  console.error('Error starting dev server:', error);
});

dev.on('close', (code) => {
  console.log(`Dev server exited with code ${code}`);
});


