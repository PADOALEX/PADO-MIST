'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { exec } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../dist');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 5500);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function resolveSafe(urlPath) {
  const decoded = decodeURIComponent(String(urlPath || '/').split('?')[0].split('#')[0]);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const full = path.normalize(path.join(ROOT, relative));
  const rel = path.relative(ROOT, full);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return full;
}

function send(res, status, headers, body) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

function serve(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, { Allow: 'GET, HEAD' }, 'Method Not Allowed');
    return;
  }
  let file;
  try {
    file = resolveSafe(req.url);
    if (file && file.includes('\0')) throw new Error('Invalid path');
  } catch {
    send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad Request');
    return;
  }
  if (!file) {
    send(res, 403, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Forbidden');
    return;
  }
  fs.stat(file, (error, stat) => {
    if (!error && stat.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (readError, data) => {
      if (readError) {
        send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
        return;
      }
      send(res, 200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' }, req.method === 'HEAD' ? undefined : data);
    });
  });
}

function openBrowser(url) {
  if (process.env.MIST_NO_OPEN === '1') return;
  const command = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(command);
}

function start(options = {}) {
  const host = options.host || HOST;
  const port = options.port ?? PORT;
  const server = http.createServer(serve);
  server.listen(port, host, () => {
    const url = `http://${host}:${server.address().port}/`;
    console.log(`Міст: ${url}`);
    console.log(`Корінь: ${ROOT}`);
    console.log('Зупинити: Ctrl+C');
    if (options.open !== false) openBrowser(url);
  });
  return server;
}

if (require.main === module) start();

module.exports = { ROOT, resolveSafe, serve, start };
