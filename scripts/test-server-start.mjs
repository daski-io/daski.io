import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createServer as createSocketServer } from 'node:net';
import { fileURLToPath } from 'node:url';

// Starts the built server the way the Dockerfile's CMD and railway.json do
// (node ./dist/server/entry.mjs) and requires HTTP 200 on / and on
// /health/ready.json. test-agent-runtime.mjs imports the handler with
// ASTRO_NODE_AUTOSTART=disabled, so the adapter's standalone start path, the
// one a deployment runs, is exercised only here. The gateway is an offline
// stub: both routes must answer without it.
const ENTRY = fileURLToPath(new URL('../dist/server/entry.mjs', import.meta.url));
const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const DEADLINE_MS = 30_000; // to listen and answer both routes
const STOP_MS = 5_000; // grace between SIGTERM and SIGKILL

const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});
const gateway = createServer((req, res) => {
  req.resume();
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Offline stub' } }));
});
const gatewayUrl = `http://127.0.0.1:${await listen(gateway)}`;
// A free port for the site: bind port 0, read the number, release it.
const probe = createSocketServer();
const port = await listen(probe);
await new Promise(resolve => probe.close(resolve));
const siteUrl = `http://127.0.0.1:${port}`;

const env = {
  ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), DASKI_NETWORK: 'testnet',
  GATEWAY_URL: gatewayUrl, GATEWAY_INTERNAL_URL: gatewayUrl, RELEASE_SOURCE_SHA: COMMIT,
};
// An inherited override must not skip the start path under test.
delete env.ASTRO_NODE_AUTOSTART;
delete env.ASTRO_NODE_LOGGING;

const child = spawn(process.execPath, [ENTRY], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output = (output + chunk).slice(-8000); });
const exited = new Promise(resolve => {
  child.once('exit', (code, signal) => resolve({ code, signal }));
  child.once('error', error => resolve({ code: null, signal: null, error }));
});
let stopping = false;
let serverExit = null; // set only when the server exits on its own
exited.then(exit => { if (!stopping) serverExit = exit; });

// Never leave the server behind: not on a failure, a signal, or a bug here.
const running = () => child.exitCode === null && child.signalCode === null;
process.on('exit', () => { if (running()) child.kill('SIGKILL'); });
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => process.exit(1));
setTimeout(() => {
  console.error(`Built server check exceeded ${DEADLINE_MS + 2 * STOP_MS} ms; giving up.`);
  process.exit(1);
}, DEADLINE_MS + 2 * STOP_MS).unref();

const deadline = Date.now() + DEADLINE_MS;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function get(path) {
  try {
    const response = await fetch(siteUrl + path, { redirect: 'manual', signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
    return { status: response.status, type: response.headers.get('content-type') ?? '', text: await response.text() };
  } catch (error) {
    throw new Error(`GET ${path} failed: ${error.message}`);
  }
}
async function check() {
  let ready;
  for (;;) {
    if (serverExit) throw new Error('the server exited before it answered');
    if (Date.now() >= deadline) throw new Error(`the server did not answer on ${siteUrl} within ${DEADLINE_MS} ms`);
    try { ready = await get('/health/ready.json'); break; } catch { await pause(100); }
  }
  if (ready.status !== 200) throw new Error(`/health/ready.json answered ${ready.status}: ${ready.text.slice(0, 300)}`);
  const body = JSON.parse(ready.text);
  if (body.status !== 'ready' || body.commit !== COMMIT) throw new Error(`/health/ready.json is not ready for this start: ${ready.text.slice(0, 300)}`);
  const home = await get('/');
  if (home.status !== 200 || !home.type.startsWith('text/html')) throw new Error(`/ answered ${home.status} ${home.type}`);
}
async function stop() {
  if (running()) {
    stopping = true;
    child.kill('SIGTERM');
    const force = setTimeout(() => { if (running()) child.kill('SIGKILL'); }, STOP_MS);
    await exited;
    clearTimeout(force);
  } else await exited;
  gateway.closeAllConnections();
  await new Promise(resolve => gateway.close(resolve));
}

let failure = null;
try { await check(); } catch (error) { failure = error; }
await stop();
if (failure) {
  const how = serverExit ? ` (${serverExit.error?.message ?? (serverExit.signal ? `signal ${serverExit.signal}` : `exit code ${serverExit.code}`)})` : '';
  console.error(`Built server start failed: ${failure.message}${how}`);
  if (output.trim()) console.error(`--- server output ---\n${output.trimEnd()}`);
  // Fail with the server's own exit code when it has one.
  process.exit(serverExit?.code || 1);
}
console.log('Built server: node ./dist/server/entry.mjs listened, answered 200 on / and /health/ready.json, and stopped.');
process.exit(0);
