/* One shared contact source: facts.json. No tracking or form backend. */
(() => {
  'use strict';
  const facts = fetch('/assets/facts.json').then(r => {
    if (!r.ok) throw new Error('Contact facts unavailable');
    return r.json();
  });
  class MeissnerContact extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready) return;
      this.dataset.ready = '1';
      facts.then(data => this.render(data.contact)).catch(() => {
        this.replaceChildren();
        const a = document.createElement('a');
        a.href = 'mailto:team@meissner.services'; a.textContent = 'team@meissner.services';
        this.append(a);
      });
    }
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
      this.append(links, note);
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
