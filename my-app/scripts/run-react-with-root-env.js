const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

const appDir = path.resolve(__dirname, '..');
const repoRootEnvPath = path.resolve(appDir, '..', '.env');
const commandArgs = process.argv.slice(2);

dotenv.config({ path: repoRootEnvPath });

const reactScriptsBin = require.resolve('react-scripts/bin/react-scripts.js', {
  paths: [appDir],
});

const child = spawn(process.execPath, [reactScriptsBin, ...commandArgs], {
  cwd: appDir,
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
