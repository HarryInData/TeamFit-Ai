import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

const host = process.env.PISTON_GATEWAY_HOST || '127.0.0.1';
const port = Number(process.env.PISTON_GATEWAY_PORT || 4000);
const token = process.env.PISTON_GATEWAY_TOKEN || '';
const upstream = (process.env.PISTON_UPSTREAM_URL || 'http://127.0.0.1:2000').replace(/\/$/, '');
const headerName = (process.env.PISTON_AUTH_HEADER || 'X-TeamFit-Token').toLowerCase();
const maxBodyBytes = 96 * 1024;
const maxConcurrent = 8;
let active = 0;

if (Buffer.byteLength(token) < 32) {
  throw new Error('PISTON_GATEWAY_TOKEN must contain at least 32 bytes');
}

const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

function authorized(req) {
  const provided = req.headers[headerName];
  if (typeof provided !== 'string') return false;
  const actual = Buffer.from(provided);
  const expected = Buffer.from(token);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function forward(req, res, path) {
  let body;
  if (req.method === 'POST') {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxBodyBytes) return sendJson(res, 413, { message: 'Request body is too large' });
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }

  active += 1;
  try {
    const response = await fetch(`${upstream}${path}`, {
      method: req.method,
      headers: req.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body,
      signal: AbortSignal.timeout(25_000),
    });
    const responseBody = await response.arrayBuffer();
    res.writeHead(response.status, {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    });
    res.end(Buffer.from(responseBody));
  } catch {
    sendJson(res, 502, { message: 'Isolated execution service is unavailable' });
  } finally {
    active -= 1;
  }
}

createServer(async (req, res) => {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  const allowed = (req.method === 'POST' && path === '/api/v2/execute') ||
    (req.method === 'GET' && path === '/api/v2/runtimes');
  if (!allowed) return sendJson(res, 404, { message: 'Not found' });
  if (!authorized(req)) return sendJson(res, 401, { message: 'Unauthorized' });
  if (active >= maxConcurrent) return sendJson(res, 429, { message: 'Runner is busy; retry shortly' });
  if (req.method === 'POST' && !req.headers['content-type']?.includes('application/json')) {
    return sendJson(res, 415, { message: 'Content-Type must be application/json' });
  }
  return forward(req, res, path);
}).listen(port, host, () => {
  console.log(`Piston gateway listening on ${host}:${port}; upstream ${upstream}`);
});
