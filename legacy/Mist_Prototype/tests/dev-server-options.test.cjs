const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { start } = require('../scripts/dev-server.cjs');

test('port zero reaches listen so tests can use a free port', () => {
  let requested;
  const server = { listen(port, host) { requested = { port, host }; } };
  const createServer = http.createServer;
  http.createServer = () => server;
  try {
    assert.equal(start({ host: '127.0.0.1', port: 0, open: false }), server);
    assert.deepEqual(requested, { port: 0, host: '127.0.0.1' });
  } finally {
    http.createServer = createServer;
  }
});
