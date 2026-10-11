/** New visits request an invitation; existing private review state stays on this origin. */
export const requestHref = 'mailto:team@meissner.services?subject=Design%20gallery%20access%20request';
export const requestLabel = 'Request access to our design gallery';
export const contactHref = '/1/#1.CONTACT';

/** Read key names only. Unreadable storage is uncertainty, so retain the existing engine. */
export function legacyContext(win) {
  const path = win.location.pathname;
  // Every old review URL context stays intact, including unknown query/fragment variants.
  if (/^\/review(?:\/|$)/.test(path) && (win.location.search || win.location.hash)) return true;
  const params = new URLSearchParams(win.location.search);
  if (['s', 'r', 'i', 'review'].some(key => params.has(key))) return true;
  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      const storage = win[name];
      for (let i = 0; i < storage.length; i++) {
        if (String(storage.key(i)).startsWith('echo:')) return true;
      }
    } catch { return true; }
  }
  return false;
}

export function publicEntry(win, doc) {
  if (/^\/review\/?$/.test(win.location.pathname)) {
    // Constant same-origin destination: no capability, query or fragment is forwarded.
    win.location.replace(contactHref);
  } else if (/^\/review\//.test(win.location.pathname)) {
    // Subroutes remain reachable; provide the request route without starting a new session.
    const link = doc.querySelector('[data-gallery-request]');
    if (link) link.focus();
  }
}
