#!/usr/bin/env node
// Simple dev launcher: starts the consolidated backend, prints URLs, and probes link status
import { spawn } from 'node:child_process';
import process from 'node:process';

function run(name, cmd, args, options = {}) {
  const child = spawn(cmd, args, { shell: true, env: process.env, ...options });
  child.stdout.on('data', (d) => process.stdout.write(`[${name}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${name}] ${d}`));
  child.on('exit', (code) => {
    process.stdout.write(`[${name}] exited with code ${code}\n`);
  });
  return child;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function probe(url, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) {
        return await res.json().catch(() => ({}));
      }
    } catch {}
    await wait(1000);
  }
  return null;
}

async function main() {
  const backend = run('backend', 'yarn --cwd squirrel/backend dev', []);

  const status = await probe('http://localhost:8081/v1/health', 45);
  if (status) {
    console.log('\nBackend health:', JSON.stringify(status, null, 2));
  } else {
    console.log('\nBackend health: unavailable (is the service running on port 8081?)');
  }

  console.log('\nDev URLs:');
  console.log('  Backend API   http://localhost:8081/v1/health');
  console.log('  Swagger (dev) http://localhost:8081/docs');
  console.log('  Web app       http://localhost:5173');
  console.log('\nLegacy REST API not started. Run `yarn start:api-legacy` if needed.');

  // Keep parent alive while the backend runs
  backend.on('exit', () => process.exit(0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
