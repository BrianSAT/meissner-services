// Meissner.Services home page (t-623587f537): the idea belt, the ticket form and its mail, the price split, the
// Timing answer, the record's clock and the section reveals. Without this script every word is on the page, the
// ideas are a wrapped list, the clock shows the last time and the send button opens a plain mail to the team.
// Motion is transform and opacity only, starts when its section comes into view, and stays still for reduced motion.
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const hasIO = 'IntersectionObserver' in window;
  const motion = hasIO && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');
  if (motion) root.classList.add('anim');
  const EASE = 'cubic-bezier(.3,0,.1,1)';
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  // Runs fn once, when el first comes into view.
  const onView = (el, fn, margin = '0px 0px -18% 0px') => {
    if (!el) return;
    if (!hasIO) return fn();
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { rootMargin: margin });
    io.observe(el);
  };

  /* ---------- the ticket: box 1 grows, the send link is rebuilt on every input ---------- */
  const form = $('#contact');
  const what = $('#hand-what'), pay = $('#hand-pay'), tools = $('#hand-tools'), timing = $('#hand-timing');
  const send = $('#hand-send');
  if (!form || !what || !pay || !tools || !timing || !send) return;
  form.addEventListener('submit', (e) => e.preventDefault());

  const buildMail = () => {
    const lines = [];
    const w = what.value.trim().replace(/\r?\n/g, '\r\n'), p = pay.value.trim(), t = tools.value.trim();
    if (w) lines.push('What would help: ' + w);
    if (p) lines.push("What I'd pay: " + p);
    if (t) lines.push("Tools I'd like you to use: " + t);
    if (timing.value) lines.push('Timing: ASAP (I picked: ' + timing.value + ')');
    send.href = 'mailto:team@meissner.services?subject=' + encodeURIComponent('A job for the team') +
      '&body=' + encodeURIComponent(lines.join('\r\n'));
  };
  const grow = () => {
    what.style.height = 'auto';
    what.style.height = what.scrollHeight + 'px';
  };

  /* ---------- the price split: 25% to start, 75% when you're happy, in the visitor's own dollars ---------- */
  const split = $('.split'), numA = $('#split-a'), numB = $('#split-b');
  // Dollars only when the whole field is a positive number once spaces, a "$" and thousands commas are taken out
  // ("1000", "$1,234.50", " 999 "); anything else ("$1k", "300 a month", "0", blank) keeps the percentages.
  const wholeNumber = (s) => {
    const m = s.trim().match(/^\$?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)$/);
    return m ? Number(m[1].replace(/,/g, '')) : 0;
  };
  const money = (cents, dec) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: dec, maximumFractionDigits: dec,
  }).format(cents / 100);
  let shown = { a: 0, b: 0 }, target = null, tween = 0, lastShine = 0;
  const paint = (a, b, dec) => { numA.textContent = money(a, dec); numB.textContent = money(b, dec); };
  const land = () => { restart(numA, 'is-landed'); restart(numB, 'is-landed'); };
  const setSplit = () => {
    if (!split || !numA || !numB) return;
    const n = wholeNumber(pay.value), cents = Math.round(n * 100);
    cancelAnimationFrame(tween);
    if (!Number.isFinite(n) || !(cents > 0)) {
      target = null; shown = { a: 0, b: 0 };
      numA.textContent = '25%'; numB.textContent = '75%';
      split.classList.remove('is-money');
      return;
    }
    const a = Math.round(cents * 0.25), b = cents - a;
    const dec = a % 100 === 0 && b % 100 === 0 ? 0 : 2;
    target = { a, b, dec };
    if (!motion) { shown = { a, b }; paint(a, b, dec); return; }
    const now = performance.now();
    if (now - lastShine > 700) { lastShine = now; restart(split, 'is-money'); }
    const from = { ...shown }, t0 = now, dur = 700;
    const step = (t) => {
      const k = easeOut(Math.min(1, (t - t0) / dur));
      shown = { a: Math.round(from.a + (a - from.a) * k), b: Math.round(from.b + (b - from.b) * k) };
      paint(shown.a, shown.b, dec);
      if (k < 1) tween = requestAnimationFrame(step); else land();
    };
    tween = requestAnimationFrame(step);
  };
  onView(split, () => split.classList.add('is-in'));

  /* ---------- Timing: a face over the select. Its list offers the select's picks; any pick flips the face to ASAP.
     The select keeps the real pick for the mail. Without script the plain select shows. ---------- */
  const tField = timing.closest('.tk-field'), tLabel = $('#hand-timing-l');
  const face = document.createElement('button'), card = document.createElement('span'), box = document.createElement('ul');
  face.type = 'button';
  face.id = 'hand-timing-face';
  face.className = 'tk-select tk-face';
  face.setAttribute('aria-haspopup', 'listbox');
  face.setAttribute('aria-expanded', 'false');
  face.setAttribute('aria-controls', 'hand-timing-list');
  face.setAttribute('aria-labelledby', 'hand-timing-l hand-timing-face');
  card.className = 'tk-card';
  face.append(card);
  box.id = 'hand-timing-list';
  box.className = 'tk-list';
  box.setAttribute('role', 'listbox');
  box.setAttribute('aria-labelledby', 'hand-timing-l');
  box.tabIndex = -1;
  box.hidden = true;
  const opts = [...timing.options].filter((o) => !o.disabled).map((o, i) => {
    const li = document.createElement('li');
    li.id = 'hand-timing-o' + i;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(o.value === timing.value));
    li.textContent = o.textContent;
    box.append(li);
    return li;
  });
  const showFace = () => {
    face.classList.toggle('is-empty', !timing.value);
    card.textContent = timing.value ? 'ASAP' : timing.options[0].textContent;
  };
  showFace();
  timing.hidden = true;
  timing.after(face, box);
  if (tLabel) tLabel.htmlFor = face.id;
  let active = 0, flipping = null;
  const setActive = (i) => {
    active = (i + opts.length) % opts.length;
    opts.forEach((o, k) => o.classList.toggle('is-active', k === active));
    box.setAttribute('aria-activedescendant', opts[active].id);
  };
  const openList = () => {
    box.hidden = false;
    face.setAttribute('aria-expanded', 'true');
    setActive(Math.max(0, opts.findIndex((o) => o.textContent === timing.value)));
    box.focus({ preventScroll: true });
  };
  const closeList = (refocus) => {
    if (box.hidden) return;
    box.hidden = true;
    face.setAttribute('aria-expanded', 'false');
    if (refocus) face.focus({ preventScroll: true });
  };
  // The flip: the old card folds away about its middle and ASAP folds in, 340 ms in all; none for reduced motion.
  const flip = () => {
    if (!motion || !card.animate) return showFace();
    if (flipping) flipping.cancel();
    flipping = card.animate([{ transform: 'rotateX(0)' }, { transform: 'rotateX(90deg)' }], { duration: 140, easing: 'ease-in' });
    flipping.onfinish = () => {
      showFace();
      flipping = card.animate([{ transform: 'rotateX(-90deg)' }, { transform: 'rotateX(14deg)', offset: 0.7 }, { transform: 'none' }], { duration: 200, easing: 'ease-out' });
    };
  };
  const choose = (i) => {
    timing.value = opts[i].textContent;
    opts.forEach((o, k) => o.setAttribute('aria-selected', String(k === i)));
    closeList(true);
    flip();
    timing.dispatchEvent(new Event('change'));
  };
  face.addEventListener('click', () => (box.hidden ? openList() : closeList(true)));
  face.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openList(); }
  });
  box.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'Tab') return closeList(false);
    if (k === 'ArrowDown') setActive(active + 1);
    else if (k === 'ArrowUp') setActive(active - 1);
    else if (k === 'Home') setActive(0);
    else if (k === 'End') setActive(opts.length - 1);
    else if (k === 'Enter' || k === ' ') choose(active);
    else if (k === 'Escape') closeList(true);
    else return;
    e.preventDefault();
  });
  box.addEventListener('click', (e) => {
    const li = e.target.closest('[role="option"]');
    if (li) choose(opts.indexOf(li));
  });
  // The pointer moves the one highlight, as in a native list, so a hovered row and the active row never both show.
  box.addEventListener('pointermove', (e) => {
    const li = e.target.closest('[role="option"]');
    if (li && opts.indexOf(li) !== active) setActive(opts.indexOf(li));
  });
  document.addEventListener('pointerdown', (e) => { if (!tField.contains(e.target)) closeList(false); }, true);

  /* ---------- Timing: the team answers in a speech bubble ---------- */
  const bubble = $('.tk-bubble'), say = $('#timing-say');
  const SAY = say ? say.textContent : '';
  let hideT = 0, typeT = 0;
  const hideBubble = () => {
    clearTimeout(hideT); clearTimeout(typeT);
    if (bubble) bubble.classList.remove('is-up', 'is-typing');
  };
  if (bubble && say) {
    say.textContent = '';
    timing.addEventListener('change', () => {
      hideBubble();
      say.textContent = '';
      void bubble.offsetWidth;
      bubble.classList.add('is-up');
      const answer = () => { bubble.classList.remove('is-typing'); say.textContent = SAY; };
      if (motion) { bubble.classList.add('is-typing'); typeT = setTimeout(answer, 650); } else answer();
      hideT = setTimeout(hideBubble, motion ? 5650 : 5000);
    });
    const elsewhere = (e) => {
      if (bubble.classList.contains('is-up') && !tField.contains(e.target)) hideBubble();
    };
    document.addEventListener('pointerdown', elsewhere, true);
    document.addEventListener('keydown', elsewhere, true);
    document.addEventListener('focusin', elsewhere, true);
  }

  form.addEventListener('input', (e) => {
    if (e.target === what) grow();
    if (e.target === pay) setSplit();
    buildMail();
  });
  timing.addEventListener('change', buildMail);
  grow();
  buildMail();
  setSplit();

  /* ---------- the idea belt ---------- */
  const belt = $('.ideas-belt'), track = $('.ideas-track'), list = $('.ideas-list');
  const whatField = what.closest('.tk-field');

  const fly = (btn, idea) => {
    const from = btn.getBoundingClientRect(), to = what.getBoundingClientRect();
    const cs = getComputedStyle(btn);
    const g = document.createElement('span');
    g.className = 'idea idea-ghost';
    g.setAttribute('aria-hidden', 'true');
    g.textContent = idea;
    g.style.fontSize = cs.fontSize;
    g.style.setProperty('--band', cs.getPropertyValue('--band'));
    g.style.transformOrigin = '0 0';
    document.body.append(g);
    const s = Math.min(1, 18 / parseFloat(cs.fontSize));
    const tx = to.left - 10, ty = to.top + Math.max(0, Math.min(to.height, what.scrollHeight) - 34);
    const mx = (from.left + tx) / 2, my = Math.min(from.top, ty) - 46;
    g.animate([
      { transform: `translate(${from.left}px, ${from.top}px)`, opacity: 1 },
      { transform: `translate(${mx}px, ${my}px) rotate(-4deg) scale(${(1 + s) / 2})`, opacity: 1, offset: 0.45 },
      { transform: `translate(${tx}px, ${ty}px) scale(${s})`, opacity: 0 },
    ], { duration: 680, easing: EASE }).onfinish = () => g.remove();
    btn.animate([{ transform: 'rotate(-7deg)' }, { transform: 'rotate(4deg)' }, { transform: 'none' }], { duration: 560, easing: EASE });
  };

  const pick = (btn) => {
    const idea = btn.textContent.trim();
    const had = what.value.replace(/\s+$/, '');
    what.value = had ? had + '\n' + idea : idea;
    grow();
    buildMail();
    what.focus({ preventScroll: true });
    const r = what.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) what.scrollIntoView({ block: 'center', behavior: 'instant' });
    what.setSelectionRange(what.value.length, what.value.length);
    if (whatField) {
      restart(whatField, 'is-fed');
      setTimeout(() => whatField.classList.remove('is-fed'), 1200);
    }
    if (motion) fly(btn, idea);
  };

  if (belt && track && list) {
    track.addEventListener('click', (e) => {
      const btn = e.target.closest('.idea');
      if (btn) pick(btn);
    });

    if (motion && typeof track.animate === 'function') {
      const clone = list.cloneNode(true);
      clone.removeAttribute('aria-labelledby');
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('button').forEach((b) => { b.tabIndex = -1; });
      track.append(clone);
      belt.classList.add('is-belt');

      const SPEED = 26; // px per second
      const holds = new Set(['view']);
      let anim = null, W = 1, dur = 1;
      const sync = () => { if (anim) (holds.size ? anim.pause() : anim.play()); };
      const setup = () => {
        const nextW = clone.offsetLeft - list.offsetLeft;
        if (!(nextW > 0) || (anim && nextW === W)) return;
        const at = anim ? (anim.currentTime % dur) / dur : 0;
        if (anim) anim.cancel();
        W = nextW; dur = (W / SPEED) * 1000;
        anim = track.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-W}px)` }], { duration: dur, iterations: Infinity });
        anim.currentTime = at * dur;
        anim.pause();
        sync();
      };
      setup();
      if ('ResizeObserver' in window) new ResizeObserver(setup).observe(list);

      new IntersectionObserver((es) => {
        es[0].isIntersecting ? holds.delete('view') : holds.add('view');
        sync();
      }).observe(belt);
      document.addEventListener('visibilitychange', () => {
        document.hidden ? holds.add('page') : holds.delete('page');
        sync();
      });
      belt.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { holds.add('hover'); sync(); } });
      belt.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { holds.delete('hover'); sync(); } });
      let touchT = 0;
      belt.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        clearTimeout(touchT); holds.add('touch'); sync();
      });
      const letGo = (e) => {
        if (e.pointerType === 'mouse') return;
        clearTimeout(touchT);
        touchT = setTimeout(() => { holds.delete('touch'); sync(); }, 2500);
      };
      belt.addEventListener('pointerup', letGo);
      belt.addEventListener('pointercancel', letGo);
      belt.addEventListener('focusin', (e) => {
        holds.add('focus'); sync();
        belt.scrollLeft = 0;
        const li = e.target.closest('li');
        if (!anim || !li || !list.contains(li)) return;
        // A keyboard visitor's idea is brought into view; a clicked one stays where it was.
        let kb = false;
        try { kb = e.target.matches(':focus-visible'); } catch { kb = true; }
        if (!kb) return;
        const x = ((anim.currentTime % dur) / dur) * W, V = belt.clientWidth, bw = li.offsetWidth;
        const left = li.offsetLeft - x;
        if (left < 24 || left > V - bw - 24) {
          const nx = Math.max(0, Math.min(W - 1, li.offsetLeft - (V - bw) / 2));
          anim.currentTime = (nx / W) * dur;
        }
      });
      belt.addEventListener('focusout', (e) => {
        if (!belt.contains(e.relatedTarget)) { holds.delete('focus'); sync(); }
      });
    }
  }

  /* ---------- the record: the clock runs from the request to the checked page ---------- */
  const wrap = $('.record-wrap');
  const rows = $$('.rec-row'), notes = $$('.rec-note');
  const clockBox = $('.record-clock');
  const hr = $('.clock-hr'), mn = $('.clock-mn'), echoes = $$('.clock-echo');
  if (motion && wrap && clockBox && hr && mn && rows.length > 1) {
    const minuteOf = (row) => Math.floor(Date.parse(row.dataset.utc) / 60000);
    const m0 = minuteOf(rows[0]), total = minuteOf(rows[rows.length - 1]) - m0;
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date(m0 * 60000));
    const get = (t) => Number((parts.find((p) => p.type === t) || {}).value);
    const dial0 = (get('hour') % 12) * 60 + get('minute');
    if (total > 0 && Number.isFinite(dial0)) {
      const endH = hr.style.transform, endM = mn.style.transform;
      const at = (e) => [`rotate(${(dial0 + e) * 0.5}deg)`, `rotate(${(dial0 + e) * 6}deg)`];
      const light = (e) => {
        rows.forEach((row, i) => {
          if (minuteOf(row) - m0 <= e + 1e-6) {
            row.classList.add('is-lit');
            if (i === 2) notes.forEach((n, k) => setTimeout(() => n.classList.add('is-lit'), 140 + k * 160));
          }
        });
      };
      const [h0, mm0] = at(0);
      hr.style.transform = h0; mn.style.transform = mm0;
      echoes.forEach((g) => { g.style.transform = mm0; });
      wrap.classList.add('is-armed');
      light(0);
      onView(wrap, () => {
        const D = Math.max(2600, Math.min(4800, 1800 + total * 6));
        const t0 = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - t0) / D), e = easeInOut(p) * total;
          const [h, m] = at(e);
          hr.style.transform = h; mn.style.transform = m;
          echoes.forEach((g, k) => {
            const pk = Math.max(0, p - (k + 1) * 0.012);
            g.style.transform = at(easeInOut(pk) * total)[1];
            g.style.opacity = String(p < 1 ? Math.min(1, p * 8) * (0.85 - k * 0.17) : 0);
          });
          light(e);
          if (p < 1) return requestAnimationFrame(step);
          hr.style.transform = endH; mn.style.transform = endM;
          echoes.forEach((g) => { g.style.transform = endM; g.style.opacity = ''; });
          rows.forEach((r) => r.classList.add('is-lit'));
          notes.forEach((n) => n.classList.add('is-lit'));
          clockBox.classList.add('is-done');
        };
        requestAnimationFrame(step);
      }, '0px 0px -30% 0px');
    }
  }

  /* ---------- reveals ---------- */
  for (const sel of ['.claim-more', '.kinds', '.qa-grid', '.who-copy']) {
    const el = $(sel);
    onView(el, () => el.classList.add('is-in'));
  }
})();
