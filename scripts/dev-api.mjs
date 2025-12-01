/* eslint-disable no-console */
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { resolve } from 'node:path';

const apiDir = resolve(process.cwd());
const distMain = resolve(apiDir, 'dist', 'main.js');

let server = null;
let restarting = false;

function startServer() {
  if (server) return;
  server = spawn(process.execPath, [distMain], { stdio: 'inherit' });
  server.on('exit', (code) => {
    if (!restarting) {
      console.log(`[api] server exited with code ${code}`);
      process.exit(code ?? 1);
    }
  });
}

function restartServer() {
  if (restarting) return;
  restarting = true;
  if (server) {
    server.kill('SIGTERM');
    server = null;
  }
  setTimeout(() => {
    restarting = false;
    startServer();
  }, 200);
}

// Start TypeScript compiler in watch mode
const tsc = spawn('yarn', ['tsc', '-w', '-p', 'tsconfig.json'], { stdio: 'inherit', cwd: apiDir, shell: true });

tsc.on('exit', (code) => {
  console.log(`[api] tsc exited with code ${code}`);
  process.exit(code ?? 1);
});

// Start server once dist exists and watch for changes
let debounce;
watch(resolve(apiDir, 'dist'), { recursive: true }, (event, filename) => {
  if (!filename) return;
  if (!/\.js$/.test(filename)) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => restartServer(), 100);
});

// Kick off initial start after slight delay for first build
setTimeout(() => startServer(), 1000);

