/* Demo Google reCAPTCHA v2. Uses Google's public test site key. No server verification. */
(function (root) {
  'use strict';
  const KEY = 'mist.captcha.v1';
  // Official Google test key: always passes, documented for demos and localhost.
  // https://developers.google.com/recaptcha/docs/faq
  const SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

  function hasDemoToken(token) {
    return typeof token === 'string' && token.trim().length > 20;
  }

  function widgetToken() {
    try { return root.grecaptcha && root.grecaptcha.getResponse ? root.grecaptcha.getResponse() : ''; } catch { return ''; }
  }

  function passed() {
    try { return sessionStorage.getItem(KEY) === 'ok'; } catch { return false; }
  }

  function remember() {
    try { sessionStorage.setItem(KEY, 'ok'); } catch { /* session may be blocked */ }
  }

  function unlock() {
    document.body.classList.remove('captcha-locked');
    document.getElementById('captcha-gate')?.remove();
    root.dispatchEvent(new Event('mist-captcha-passed'));
  }

  function showError(text) {
    const error = document.getElementById('captcha-error');
    if (error) {
      error.textContent = text;
      if (text) error.focus();
    }
  }

  function bind() {
    if (passed()) { unlock(); return; }
    const gate = document.getElementById('captcha-gate');
    const form = document.getElementById('captcha-form');
    const widget = document.getElementById('captcha-widget');
    const retry = document.getElementById('captcha-retry');
    if (!gate || !form || !widget) {
      showError('Не вдалося підготувати перевірку. Оновіть сторінку.');
      return;
    }
    let ready = false;
    let loadTimer;
    const loadError = () => {
      root.clearTimeout(loadTimer);
      showError('Не вдалося завантажити Google reCAPTCHA. Перевірте інтернет і натисніть «Оновити перевірку».');
    };
    retry?.addEventListener('click', () => root.location.reload());

    root.mistCaptchaReady = function () {
      root.clearTimeout(loadTimer);
      if (!root.grecaptcha || !root.grecaptcha.render) {
        loadError();
        return;
      }
      try {
        root.grecaptcha.render(widget, {
          sitekey: SITE_KEY,
          hl: 'uk',
          // Compact fits narrow screens and stays usable after rotating the phone.
          size: 'compact',
          callback() { showError(''); },
          'expired-callback'() { showError('Час перевірки минув. Поставте позначку «Я не робот» ще раз.'); },
          'error-callback': loadError
        });
        ready = true;
        showError('');
      } catch {
        loadError();
      }
    };

    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?hl=uk&onload=mistCaptchaReady&render=explicit';
    script.async = true;
    script.defer = true;
    script.onerror = loadError;
    loadTimer = root.setTimeout(loadError, 15000);
    document.head.appendChild(script);

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!ready) {
        showError('Дочекайтеся появи Google reCAPTCHA. Якщо перевірка не завантажується, натисніть «Оновити перевірку».');
        return;
      }
      if (!hasDemoToken(widgetToken())) {
        showError('Спочатку поставте позначку «Я не робот».');
        return;
      }
      remember();
      unlock();
    });
  }

  const api = { KEY, SITE_KEY, hasDemoToken, passed };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MistCaptcha = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
