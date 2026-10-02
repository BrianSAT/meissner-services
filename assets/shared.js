/* One shared contact source: facts.json. Only Turnstile for the separately commissioned Worker form. */
(() => {
  'use strict';
  const facts = fetch('/assets/facts.json').then(r => {
    if (!r.ok) throw new Error('Contact facts unavailable');
    return r.json();
  });
  let turnstile;
  function challengeApi() {
    if (!turnstile) turnstile = new Promise((resolve, reject) => {
      if (window.turnstile) { resolve(window.turnstile); return; }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true; script.defer = true;
      script.onload = () => window.turnstile.ready(() => resolve(window.turnstile));
      script.onerror = reject; document.head.append(script);
    });
    return turnstile;
  }
  function projectForm(spanish) {
    const details = document.createElement('details'); details.className = 'shared-project-form';
    const summary = document.createElement('summary');
    summary.textContent = spanish ? 'Enviar una nota sobre tu proyecto' : 'Send a project note';
    const form = document.createElement('form');
    form.action = 'https://api.meissner.services/contact'; form.method = 'POST';
    for (const [name, label, type, autocomplete] of [
      ['name', spanish ? 'Nombre (opcional)' : 'Name (optional)', 'text', 'name'],
      ['email', 'Email', 'email', 'email'], ['whatsapp', 'WhatsApp', 'tel', 'tel'],
      ['message', spanish ? 'Tu proyecto' : 'Your project', 'textarea', 'off']]) {
      const wrap = document.createElement('label'); wrap.textContent = label;
      const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
      input.name = name; input.autocomplete = autocomplete;
      if (type !== 'textarea') input.type = type;
      else { input.required = true; input.rows = 4; }
      input.addEventListener('input', () => form.elements.email.setCustomValidity(''));
      wrap.append(input); form.append(wrap);
    }
    const variant = location.pathname.match(/^\/([1-7])(?:\/|$)/)?.[1];
    for (const [name, value] of [['variant', variant || ''], ['lang', spanish ? 'es' : 'en']]) {
      const input = document.createElement('input'); input.type = 'hidden';
      input.name = name; input.value = value; form.append(input);
    }
    const trap = document.createElement('div'); trap.className = 'shared-form-trap';
    trap.setAttribute('aria-hidden', 'true');
    const honey = document.createElement('input'); honey.name = 'website';
    honey.tabIndex = -1; honey.autocomplete = 'off'; trap.append(honey); form.append(trap);
    const note = document.createElement('p'); note.className = 'shared-contact-note';
    note.textContent = spanish ? 'Incluye email o WhatsApp para poder responderte.' : 'Include email or WhatsApp so we can reply.';
    const widget = document.createElement('div'); widget.className = 'shared-turnstile';
    const status = document.createElement('p'); status.className = 'shared-contact-note';
    status.setAttribute('role', 'status');
    const submit = document.createElement('button'); submit.type = 'submit'; submit.disabled = true;
    submit.textContent = spanish ? 'Enviar nota' : 'Send project note';
    form.append(note, widget, status, submit);
    form.addEventListener('submit', event => {
      if (!form.elements.email.value.trim() && !form.elements.whatsapp.value.trim()) {
        event.preventDefault();
        form.elements.email.setCustomValidity(spanish ? 'Incluye email o WhatsApp.' : 'Include email or WhatsApp.');
        form.elements.email.reportValidity();
      }
    });
    details.addEventListener('toggle', () => {
      if (!details.open || widget.dataset.started) return;
      widget.dataset.started = '1';
      status.textContent = spanish ? 'Cargando protección contra spam…' : 'Loading spam protection…';
      challengeApi().then(api => {
        const local = ['localhost', '127.0.0.1'].includes(location.hostname);
        api.render(widget, {sitekey: local ? '1x00000000000000000000AA' : '0x4AAAAAAFLx3ja-z07QWqEj',
          theme: 'auto', size: widget.clientWidth < 300 ? 'compact' : 'normal', language: spanish ? 'es' : 'en',
          callback: () => { submit.disabled = false; status.textContent = ''; },
          'expired-callback': () => { submit.disabled = true; },
          'error-callback': () => { submit.disabled = true; status.textContent = spanish ? 'La verificación no está disponible. Usa email o WhatsApp.' : 'Verification unavailable. Use email or WhatsApp.'; }
        });
      }).catch(() => { status.textContent = spanish ? 'Usa email o WhatsApp; la verificación no se ha cargado.' : 'Use email or WhatsApp; verification could not load.'; });
    });
    const wrapper = document.createElement('div');
    const result = document.createElement('p'); result.className = 'shared-contact-note'; result.setAttribute('role', 'status');
    if (location.hash === '#contact-sent') result.textContent = spanish ? 'Nota recibida. Gracias.' : 'Project note received. Thank you.';
    else if (location.hash.startsWith('#contact-error-')) {
      result.textContent = spanish ? 'No se pudo enviar. Usa email o WhatsApp o inténtalo de nuevo.' : 'Your note was not sent. Use email or WhatsApp, or try again.';
    }
    details.append(summary, form);
    wrapper.append(result, details);
    return wrapper;
  }
  class MeissnerContact extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready) return;
      this.dataset.ready = '1';
      facts.then(data => {
        this.contact = data.contact; this.render(data.contact);
        this.languageObserver = new MutationObserver(() => {
          if (this.closest('[lang]') === document.documentElement) this.render(this.contact);
        });
        this.languageObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
      }).catch(() => {
        this.replaceChildren();
        const a = document.createElement('a');
        a.href = 'mailto:team@meissner.services'; a.textContent = 'team@meissner.services';
        this.append(a);
      });
    }
    disconnectedCallback() { this.languageObserver?.disconnect(); delete this.dataset.ready; }
    render(contact) {
      this.replaceChildren();
      const spanish = (this.closest('[lang]')?.lang || document.documentElement.lang).startsWith('es');
      const links = document.createElement('div'); links.className = 'shared-contact-links';
      for (const [href, label] of [[contact.mailto, spanish ? 'Enviar un email ↗' : 'Email your project ↗'],
        [contact.whatsapp_link, spanish ? 'Hablar por WhatsApp ↗' : 'Talk on WhatsApp ↗']]) {
        if (!href) continue;
        const a = document.createElement('a'); a.href = href; a.textContent = label;
        links.append(a);
      }
      const note = document.createElement('p'); note.className = 'shared-contact-note';
      note.textContent = `${contact.email} · ${contact.whatsapp_display} · ${spanish ? 'Inglés o español. Portugués conversacional.' : 'English or Spanish. Portuguese conversational.'}`;
      this.append(links, note, projectForm(spanish));
    }
  }
  if (!customElements.get('meissner-contact')) customElements.define('meissner-contact', MeissnerContact);
  if (new URLSearchParams(location.search).get('tags') === '1') {
    document.body.classList.add('tags');
    document.querySelectorAll('[id]').forEach(section => {
      if (!/^[1-7]\.[A-Z][A-Z0-9_-]*$/.test(section.id) || section.querySelector(':scope > .tag,:scope > .review-section-tag')) return;
      const tag = document.createElement('span'); tag.className = 'review-section-tag';
      tag.textContent = section.id; section.prepend(tag);
    });
  }
  document.querySelectorAll('[data-shared-theme]').forEach(button => {
    button.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const dark = current !== 'dark';
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      button.setAttribute('aria-pressed', String(dark));
    });
  });
})();
