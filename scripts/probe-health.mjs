/* eslint-disable no-console */
const targets = {
  api: process.env.API_URL || 'http://localhost:8081/v1/health',
  proxy: process.env.PROXY_URL || 'http://localhost:5173/v1/health',
};

function parseArgs() {
  const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
  const timeoutMs = Number(process.env.TIMEOUT_MS || '4000');
  return { only, timeoutMs };
}

async function get(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const { only, timeoutMs } = parseArgs();
  const checks = [];
  if (!only || only === 'api') checks.push(['api', targets.api]);
  if (!only || only === 'proxy') checks.push(['proxy', targets.proxy]);

  let failures = 0;
  for (const [name, url] of checks) {
    const res = await get(url, timeoutMs);
    if (res.ok) {
      console.log(`[OK] ${name} ${url} -> ${res.status}`);
    } else {
      failures++;
      console.error(`[ERR] ${name} ${url} -> ${res.status} ${res.error ?? ''}`);
    }
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
