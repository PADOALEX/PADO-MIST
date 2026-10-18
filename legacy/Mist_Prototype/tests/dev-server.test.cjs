const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ROOT, resolveSafe, start } = require('../scripts/dev-server.cjs');

test('static server stays inside dist and serves the prototype', async () => {
  assert.equal(path.basename(ROOT), 'dist');
  assert.ok(resolveSafe('/index.html').endsWith(`${path.sep}index.html`));
  assert.equal(resolveSafe('/../package.json'), null);
  assert.equal(resolveSafe('/js/../../package.json'), null);

  const server = start({ host: '127.0.0.1', port: 0, open: false });
  await new Promise((resolve, reject) => server.once('listening', resolve).once('error', reject));
  const { port } = server.address();
  try {
    const home = await fetch(`http://127.0.0.1:${port}/`);
    const html = await home.text();
    assert.equal(home.status, 200);
    assert.ok(html.includes('Мої документи'));
    assert.ok(html.includes('js/app.js'));

    const css = await fetch(`http://127.0.0.1:${port}/styles.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type') || '', /text\/css/);

    const blocked = await fetch(`http://127.0.0.1:${port}/../package.json`);
    assert.ok(blocked.status === 403 || blocked.status === 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
