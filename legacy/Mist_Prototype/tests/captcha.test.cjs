const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Captcha = require('../dist/js/captcha.js');
const source = fs.readFileSync(require.resolve('../dist/js/captcha.js'), 'utf8');

// Test the client gate with a stub Google API; no Google request or challenge is sent.
function gateFixture({ remembered = false, missingWidget = false } = {}) {
  const listeners = new Map(), events = [], scripts = [], timers = new Map();
  const classes = new Set(['captcha-locked']);
  const storage = new Map(remembered ? [[Captcha.KEY, 'ok']] : []);
  const nodes = new Map();
  let response = '', options, reloads = 0, timerId = 0;
  for (const id of ['captcha-gate', 'captcha-form', 'captcha-widget', 'captcha-error', 'captcha-retry']) {
    nodes.set(id, {
      textContent: '',
      focus() {},
      remove() { nodes.delete(id); },
      addEventListener(type, callback) { listeners.set(`${id}:${type}`, callback); }
    });
  }
  if (missingWidget) nodes.delete('captcha-widget');
  const context = vm.createContext({
    Event,
    document: {
      readyState: 'complete',
      body: { classList: { remove: value => classes.delete(value) } },
      getElementById: id => nodes.get(id) || null,
      createElement: () => ({}),
      head: { appendChild: script => scripts.push(script) }
    },
    sessionStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value)
    },
    grecaptcha: {
      render(widget, config) { options = config; return 0; },
      getResponse: () => response
    },
    location: { reload() { reloads++; } },
    dispatchEvent: event => events.push(event.type),
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id)
  });
  vm.runInContext(source, context);
  return {
    classes, storage, events, scripts, timers,
    get error() { return nodes.get('captcha-error').textContent; },
    get options() { return options; },
    get reloads() { return reloads; },
    ready: () => context.mistCaptchaReady(),
    setResponse: value => { response = value; },
    submit: () => listeners.get('captcha-form:submit')({ preventDefault() {} }),
    retry: () => listeners.get('captcha-retry:click')()
  };
}

test('demo reCAPTCHA accepts only a non-empty Google token shape', () => {
  assert.equal(Captcha.SITE_KEY, '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI');
  assert.equal(Captcha.hasDemoToken(''), false);
  assert.equal(Captcha.hasDemoToken('short'), false);
  assert.equal(Captcha.hasDemoToken('03AGdBq27demoTokenForClientSideGateOnly'), true);
});

test('failed or stalled loading keeps CAPTCHA mandatory and retry reloads the page', () => {
  for (const failure of ['network', 'timeout']) {
    const gate = gateFixture();
    if (failure === 'network') gate.scripts[0].onerror();
    else [...gate.timers.values()][0]();
    assert.match(gate.error, /Оновити перевірку/);
    assert.equal(gate.classes.has('captcha-locked'), true);
    assert.equal(gate.storage.has(Captcha.KEY), false);
    assert.deepEqual(gate.events, []);
    gate.retry();
    assert.equal(gate.reloads, 1);
    assert.equal(gate.classes.has('captcha-locked'), true);
  }
});

test('only a ready widget with a completed response opens the cabinet', () => {
  const gate = gateFixture();
  gate.submit();
  assert.equal(gate.classes.has('captcha-locked'), true);
  gate.ready();
  assert.equal(gate.timers.size, 0);
  assert.equal(gate.options.size, 'compact');
  gate.submit();
  assert.equal(gate.classes.has('captcha-locked'), true);
  assert.equal(gate.storage.has(Captcha.KEY), false);
  gate.setResponse('03AGdBq27demoTokenForClientSideGateOnly');
  gate.options.callback();
  gate.submit();
  assert.equal(gate.classes.has('captcha-locked'), false);
  assert.equal(gate.storage.get(Captcha.KEY), 'ok');
  assert.deepEqual(gate.events, ['mist-captcha-passed']);
});

test('an expired response requires another CAPTCHA completion', () => {
  const gate = gateFixture();
  gate.ready();
  gate.setResponse('03AGdBq27demoTokenForClientSideGateOnly');
  gate.options.callback();
  gate.setResponse('');
  gate.options['expired-callback']();
  assert.match(gate.error, /Час перевірки минув/);
  gate.submit();
  assert.equal(gate.classes.has('captcha-locked'), true);
  assert.equal(gate.storage.has(Captcha.KEY), false);
});

test('an already completed session keeps the existing once-per-tab behavior', () => {
  const gate = gateFixture({ remembered: true });
  assert.equal(gate.classes.has('captcha-locked'), false);
  assert.equal(gate.scripts.length, 0);
  assert.deepEqual(gate.events, ['mist-captcha-passed']);
});

test('missing CAPTCHA markup does not silently open the cabinet', () => {
  const gate = gateFixture({ missingWidget: true });
  assert.equal(gate.classes.has('captcha-locked'), true);
  assert.match(gate.error, /Оновіть сторінку/);
  assert.deepEqual(gate.events, []);
});
