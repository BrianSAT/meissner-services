// Meissner.Services dark toggle (Brian, Nov 9, 2026): black page, cream text, the same red. Load it in <head>
// with no defer, so a saved choice applies before first paint. Cream is the default; the choice is kept per site.
(() => {
  const root = document.documentElement, key = 'ms-theme';
  const dark = () => root.dataset.theme === 'dark';
  try { if (localStorage.getItem(key) === 'dark') root.dataset.theme = 'dark'; } catch {}
  addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ms-theme-toggle';
    const label = () => {
      button.textContent = dark() ? 'Light' : 'Dark';
      button.setAttribute('aria-label', `Switch to ${dark() ? 'light' : 'dark'} mode`);
    };
    const flip = () => {
      if (dark()) delete root.dataset.theme; else root.dataset.theme = 'dark';
      try { localStorage.setItem(key, dark() ? 'dark' : 'light'); } catch {}
      label();
    };
    button.addEventListener('click', () => document.startViewTransition ? document.startViewTransition(flip) : flip());
    label();
    (document.querySelector('header') || document.body).append(button);
  });
})();
