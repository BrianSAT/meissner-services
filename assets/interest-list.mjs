/* Shared UI at seven contact areas and after the summary. Independent of every other form. */
import {consentCopy, interestController, interestTransport} from './interest-core.mjs';
const loaders = new WeakMap();
export function challengeApi(doc = document, win = window) {
  if (win.turnstile) return Promise.resolve(win.turnstile);
  if (!loaders.has(doc)) {
    const promise = new Promise((resolve, reject) => {
      const script = doc.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true; script.defer = true; script.referrerPolicy = 'no-referrer';
      script.onload = () => win.turnstile ? resolve(win.turnstile) : reject(new Error('captcha_failed'));
      script.onerror = () => reject(new Error('captcha_failed'));
      doc.head.append(script);
    });
    loaders.set(doc, promise);
    promise.catch(() => loaders.delete(doc));
  }
  return loaders.get(doc);
}
let serial = 0;
export function mountInterest(anchor, {source, sitekey, doc = anchor.ownerDocument,
  loadChallenge = () => challengeApi(doc, doc.defaultView), transport = interestTransport(), timers = globalThis} = {}) {
  // A sibling survives asynchronous contact/summary redraws and cannot be nested in their forms.
  if (anchor.nextElementSibling?.dataset.interestPlacement === source) return anchor.nextElementSibling;
  const panel = doc.createElement('div'); panel.dataset.interestPlacement = source;
  // Shadow-root clicks retarget to this host. The existing Echo capture handler
  // must recognize it as UI rather than rating the surrounding contact section.
  panel.setAttribute('data-echo-ui', '');
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Optional Meissner Services updates'); panel.lang = 'en';
  const root = panel.attachShadow({mode: 'open'});
  function node(tag, text) { const el = doc.createElement(tag); if (text) el.textContent = text; return el; }
  const style = node('style', ':host{display:block;max-width:1100px;margin:24px auto;padding:0 16px;box-sizing:border-box;color:inherit}*{box-sizing:border-box}.box{border:1px solid currentColor;border-radius:12px;padding:20px}h2{font:700 22px/1.3 system-ui;margin:0 0 12px}p,label,button,input{font:inherit}p{line-height:1.5}form{display:grid;gap:14px}label{display:block;line-height:1.5}input[type=email]{display:block;margin-top:6px;width:100%;max-width:480px;padding:10px;border:1px solid currentColor;border-radius:6px;color:inherit;background:transparent}input[type=checkbox]{width:20px;height:20px;vertical-align:middle;margin:0 8px 0 0}button{justify-self:start;max-width:100%;padding:10px 16px;color:inherit;background:transparent;border:2px solid currentColor;border-radius:6px;cursor:pointer}input:focus-visible,button:focus-visible{outline:3px solid currentColor;outline-offset:3px}button:disabled{cursor:wait}p[role=status]{margin:0;min-height:1.5em}.challenge{max-width:100%;overflow:auto}');
  const box = node('div'); box.className = 'box';
  const form = node('form'); form.noValidate = true;
  const id = `interest-${++serial}`;
  const emailLabel = node('label', 'Email'); emailLabel.htmlFor = `${id}-email`;
  const email = node('input'); email.type = 'email'; email.id = emailLabel.htmlFor;
  email.name = 'interest_email'; email.autocomplete = 'email'; email.maxLength = 254;
  emailLabel.append(email);
  const consentLabel = node('label'); const consent = node('input');
  consent.type = 'checkbox'; consent.name = 'interest_consent'; consent.id = `${id}-consent`; consent.checked = false;
  consentLabel.htmlFor = consent.id; consentLabel.append(consent, doc.createTextNode(consentCopy));
  const widget = node('div'); widget.className = 'challenge';
  const status = node('p'); status.id = `${id}-status`; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  email.setAttribute('aria-describedby', status.id); consent.setAttribute('aria-describedby', status.id);
  const submit = node('button', 'Keep me posted'); submit.type = 'submit';
  form.append(emailLabel, consentLabel, widget, status, submit);
  box.append(node('h2', 'Keep me posted'), node('p', 'Occasional updates about what we build. Joining is optional; every feature stays available.'), form);
  root.append(style, box); anchor.after(panel);
  async function verify(signal) {
    if (!sitekey) throw new Error('configuration_unavailable');
    const api = await loadChallenge();
    if (signal.aborted) throw new Error('captcha_failed');
    return new Promise((resolve, reject) => {
      let handle, settled = false;
      const cleanup = () => { signal.removeEventListener('abort', cancel); if (handle !== undefined) api.remove(handle); };
      const finish = (token, error) => {
        if (settled) return; settled = true; cleanup();
        if (error) reject(new Error('captcha_failed')); else resolve(token);
      };
      const cancel = () => finish('', true);
      signal.addEventListener('abort', cancel, {once: true});
      try {
        handle = api.render(widget, {sitekey, size: 'compact', theme: 'auto', language: 'en',
          callback: token => finish(token, false), 'expired-callback': cancel, 'error-callback': cancel});
        if (settled) cleanup();
      } catch { finish('', true); }
    });
  }
  const controller = interestController({readInput: () => ({email: email.value, consent: consent.checked, source}), verify, transport, timers,
    onState(state) {
      email.disabled = consent.disabled = submit.disabled = state.pending;
      form.setAttribute('aria-busy', String(state.pending)); status.textContent = state.message;
      email.setAttribute('aria-invalid', String(state.error === 'bad_email'));
      consent.setAttribute('aria-invalid', String(state.error === 'consent_required'));
      if (state.phase === 'success') consent.checked = false;
      if (state.error === 'bad_email') email.focus();
      if (state.error === 'consent_required') consent.focus();
    }});
  form.addEventListener('submit', event => { event.preventDefault(); controller.submit(); });
  return panel;
}
export async function mountInterestPlaces(doc, {sitekey, pathname = doc.defaultView.location.pathname, ...options}) {
  const variant = pathname.match(/^\/([1-7])(?:\/|$)/)?.[1];
  if (variant) {
    for (const contact of doc.querySelectorAll('meissner-contact')) mountInterest(contact, {...options, source: `page-${variant}`, sitekey, doc});
  } else if (/^\/review\/summary(?:\/|$)/.test(pathname)) {
    const summary = doc.querySelector('[data-echo-summary]');
    if (summary) mountInterest(summary, {...options, source: 'summary', sitekey, doc});
  }
}
