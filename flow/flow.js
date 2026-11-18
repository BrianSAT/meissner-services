// One job, start to finish (Face's brief, t-91713ac0b5; pass 2 picture + Carbon polish t-f8ef0a2e04). The picture is
// static SVG in index.html, drawn in its finished state; this file plays it. FLOW_ART draws the five finished pieces
// (112 x 70 user units) and picks each "Not quite right" change.
const FLOW_ART = (() => {
  const R = (n) => Math.floor(Math.random() * n);
  const rect = (c, x, y, w, h, r) => `<rect class="${c}" x="${x}" y="${y}" width="${w}" height="${h}"${r ? ` rx="${r}"` : ''}/>`;
  const at = (x, y) => (y >= 35 ? 2 : 0) + (x >= 56 ? 1 : 0); // which jigsaw piece holds this point
  const letters = 'ABCDEFGHJKLMNPRSTVW';
  const flowPos = (i) => (i < 3 ? [6 + i * 36, 10] : [78 - (i - 3) * 36, 44]);
  const jobs = [
    {
      crews: ['Words', 'Design', 'Build'],
      title: 'A landing page for my new product',
      start: { acc: 0, left: true },
      art: ({ acc, left }) => {
        const p = left ? 6 : 62, t = left ? 56 : 6;
        return rect('kp', 0, 0, 112, 70) + rect('kl', 0, 0, 112, 9) + `<circle class="c${acc}" cx="7" cy="4.5" r="2.2"/>` +
          [76, 88, 100].map((x) => rect('ks', x, 3.5, 8, 2, 1)).join('') +
          rect('c3', p, 15, 44, 48, 2) + `<circle class="c${acc}" cx="${p + 31}" cy="27" r="5"/><path class="c2" d="M${p} 63l14-19 9 9 8-7 13 17z"/>` +
          rect('ki', t, 17, 48, 6, 1) + rect('ki', t, 26, 34, 6, 1) +
          [[37, 46], [42, 42], [47, 30]].map(([y, w]) => rect('ks', t, y, w, 2.5, 1)).join('') + rect('c' + acc, t, 54, 28, 9, 4.5);
      },
      asks: { side: ['Move the photo across', 'Flip the layout'], acc: ['Try a different color', 'Match our brand color'] },
      change: (s, k) => {
        if (k === 'side') return { s: { ...s, left: !s.left }, key: 'side' + !s.left, piece: 0 };
        const acc = [0, 1, 2].filter((a) => a !== s.acc)[R(2)];
        return { s: { ...s, acc }, key: 'acc' + acc, piece: s.left ? 3 : 2 };
      },
    },
    {
      crews: ['Search', 'Check', 'List'],
      title: 'A candidate list',
      asks: { row: ['Swap one candidate out', 'Find someone more senior', 'Drop one we already know'] },
      start: { rows: [{ l: 'M', a: 56, b: 30 }, { l: 'R', a: 46, b: 38 }, { l: 'T', a: 34, b: 24 }] },
      art: ({ rows }) => rect('kp', 0, 0, 112, 70) + rows.map((r, i) => {
        const y = 3 + i * 22.5;
        return rect('kl', 3, y, 106, 20, 3) + `<circle class="kp o" cx="14" cy="${y + 10}" r="8"/><text class="fl-mono" x="14" y="${y + 14.3}">${r.l}</text>` +
          rect('ki', 28, y + 5, r.a, 4.5, 1) + rect('ks', 28, y + 12.5, r.b, 3, 1) + `<path class="fl-ok" d="M92 ${y + 10}l3.5 3.5 7-7.5"/>`;
      }).join(''),
      change: (s) => {
        const i = R(3), row = { l: letters[R(letters.length)], a: 26 + R(34), b: 18 + R(24) };
        const rows = s.rows.map((r, j) => (j === i ? row : r)).sort((a, b) => b.a - a.a);
        return { s: { rows }, key: 'row' + i + row.l, piece: at(10, 3 + rows.indexOf(row) * 22.5 + 10) };
      },
    },
    {
      crews: ['Map', 'Build', 'Test'],
      title: 'A new workflow for my clients',
      start: { steps: [0, 1, 3, 2] },
      // The steps carry no text to redraw, so "Edit the text" rides with a swap.
      asks: { add: ['Link our Slack', 'Add an approval step', 'Add a reminder email'], swap: ['Move sign-off earlier', 'Swap those two steps', 'Edit the text'] },
      art: ({ steps }) => {
        let out = rect('kp', 0, 0, 112, 70), d = '';
        steps.forEach((c, i) => {
          const [x, y] = flowPos(i);
          out += rect('o c' + c, x, y, 28, 16, 3);
          if (i === steps.length - 1) return;
          const [nx] = flowPos(i + 1);
          d += i < 2 ? `M${x + 29} ${y + 8}H${nx - 2}m-4-3l4 3-4 3` : i === 2 ? 'M92 27V42m-3-3.5l3 3.5 3-3.5' : `M${x - 1} 52H${nx + 30}m4-3l-4 3 4 3`;
        });
        return out + `<path class="fl-ar" d="${d}"/>`;
      },
      change: (s, k) => {
        const steps = s.steps.slice();
        if (k === 'add') {
          const gone = steps.length < 6 ? -1 : steps.pop(); // six is all the art holds: the newest step makes room
          const cs = [0, 1, 2, 3].filter((c) => c !== steps[steps.length - 1] && c !== gone);
          steps.push(cs[R(cs.length)]);
          return { s: { steps }, key: 'add' + steps.length + steps[steps.length - 1], piece: at(...flowPos(steps.length - 1)) };
        }
        let i = R(steps.length - 1);
        while (steps[i] === steps[i + 1]) i = (i + 1) % (steps.length - 1);
        [steps[i], steps[i + 1]] = [steps[i + 1], steps[i]];
        return { s: { steps }, key: 'swap' + i, piece: at(...flowPos(i)) };
      },
    },
    {
      crews: ['Plan', 'Build', 'Test'],
      title: 'A schedule manager',
      asks: { move: ['Move one to another day', 'Spread the week out', 'Clear that day a little'] },
      start: { blocks: [{ d: 0, s: 0, n: 2, c: 0 }, { d: 1, s: 2, n: 2, c: 1 }, { d: 2, s: 1, n: 1, c: 3 }, { d: 3, s: 0, n: 3, c: 2 }, { d: 4, s: 2, n: 1, c: 0 }] },
      art: ({ blocks }) => {
        let out = rect('kp', 0, 0, 112, 70), d = '';
        for (let i = 0; i < 5; i++) out += rect('kl', 4 + i * 21, 3, 19, 6, 1);
        for (let i = 0; i < 5; i++) d += `M3 ${12 + i * 14}H108`;
        for (let i = 0; i < 6; i++) d += `M${3.5 + i * 21} 12V68`;
        out += `<path class="fl-grid" d="${d}"/>`;
        return out + blocks.map((b) => rect('c' + b.c, 5 + b.d * 21, 13 + b.s * 14, 18, b.n * 14 - 2, 2)).join('');
      },
      change: (s) => {
        for (;;) {
          const i = R(5), b = s.blocks[i], d = R(5);
          const busy = s.blocks.some((o, j) => j !== i && o.d === d && o.s < b.s + b.n && b.s < o.s + o.n);
          if (d === b.d || busy) continue;
          const blocks = s.blocks.map((o, j) => (j === i ? { ...o, d } : o));
          return { s: { blocks }, key: 'move' + i + d, piece: at(5 + d * 21, 13 + b.s * 14) };
        }
      },
    },
    {
      crews: ['Sort', 'Clear', 'File'],
      title: 'Digital cleanup',
      asks: { fold: ['Add a folder for taxes', 'Split out the photos', 'Replace the old archive'] },
      start: { f: [0, 1, 2, 3] },
      art: ({ f }) => rect('kp', 0, 0, 112, 70) + f.map((c, i) => {
        const x = 5 + i * 26.5;
        return rect('kp o', x + 4, 16, 16, 18, 1) + rect('kp o', x + 7, 21, 15, 16, 1) + rect('c' + c, x, 26, 11, 6, 1.5) + rect('o c' + c, x, 30, 24, 28, 2) + rect('kp', x + 5, 40, 14, 3, 1);
      }).join('') + '<path class="fl-ar" d="M3 62H109"/>',
      change: (s) => {
        const i = R(4), j = [0, 1, 2, 3].filter((k) => k !== i)[R(3)];
        const c = [0, 1, 2, 3].filter((k) => k !== s.f[i])[R(3)];
        const f = s.f.slice();
        f.splice(i, 1);
        f.splice(j, 0, c);
        return { s: { f }, key: 'fold' + j + c, piece: at(5 + j * 26.5, 40) };
      },
    },
  ];
  return { jobs };
})();
(() => {
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  // The voicemail number opens a dialog; without script (or without <dialog>) it stays a plain call link.
  const dial = $('#fl-dial');
  if (dial && dial.showModal) {
    let opener = null;
    $$('.fl-dial-open').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); opener = a; dial.showModal(); }));
    dial.addEventListener('close', () => { if (opener) opener.focus({ preventScroll: true }); });
    $('.fl-dial-close').addEventListener('click', () => dial.close());
    const copy = $('.fl-dial-copy');
    copy.addEventListener('click', () => navigator.clipboard.writeText('(262) 315-2739').then(() => {
      copy.textContent = 'Copied';
      setTimeout(() => (copy.textContent = 'Copy number'), 2000);
    }, () => {}));
  }
  const flow = $('.flow'), svg = $('#fl-svg');
  if (!flow || !svg || !svg.animate || !svg.getAnimations) return;
  const { jobs } = FLOW_ART, R = (n) => Math.floor(Math.random() * n), NS = 'http://www.w3.org/2000/svg';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches, wide = matchMedia('(min-width: 900px)');
  const pick = $('.flow-pick'), select = $('#flow-job'), again = $('#flow-again'), roundEl = $('#fl-round');
  const caps = $$('.flow-caps li'), dotsBox = $('.flow-dots'), say = $('.flow-say');
  const art = $('#fl-art'), art2 = $('#fl-art2'), timer = $('#fl-timer'), fly = $('#fl-fly');
  const tes = $$('.fl-te').reverse(), progw = $('#fl-progw'), nfs = $$('.fl-nf'), backOn = $('#fl-back-on');
  const chips = $$('.fl-chip'), waves = $$('.fl-bar'), eyes = $$('.fl-eyes'), leds = $$('.fl-led');
  const tkw = $('#fl-tkw'), tk = $('#fl-tk'), tkTitle = $('#fl-tk-title'), tkBand = $('#fl-tk-band'), tkCover = $('#fl-tk-cover'), tkPen = $('#fl-tk-pen'), tkLines = $$('#fl-tk .pl');
  const scp = $$('.z-scope .fl-pc'), rps = $$('.fl-rp'), clips = $$('.fl-clipw'), tvs = $$('.fl-tv'), sheet = $('#fl-sheet'), cutw = $('#fl-cutw'), cuth = $('#fl-cuth');
  const ink = (g) => g.querySelector('.fl-ink'), artUse = (g) => g.querySelector('.fl-ink use'), tvo = (g) => g.querySelector('.fl-tvo');
  const hands = [$('#fl-hm'), $('#fl-hh')], pgs = [0, 1, 2, 3].map((j) => $('#fl-pg' + j)), crewText = $$('.fl-crew .cl'), lock = $('#fl-lock');
  // Each crew's tiles are the .fl-t inside its .fl-crew group, whatever the layout.
  const benches = $$('.fl-crew').map((c) => [...c.querySelectorAll('.fl-t')].map((g) => ({ g, dot: g.querySelector('.fl-td') })));
  const tiles = benches.flat();
  // The three sheepdogs: [0] works The Rail, [1] your files, [2] The Library. Home is where the feet stand (data-home).
  const dogs = $$('.fl-dog').map((g) => {
    const q = (c) => g.querySelector('.fl-' + c), [hx, hy] = g.dataset.home.split(' ').map(Number);
    return { hx, hy, x: q('dx'), y: q('dy'), f: q('df'), p: q('dp'), tail: q('dtail'), hind: q('dhind'), fore: q('dfore'), head: q('dhead'), carry: q('carry') };
  });
  const [railDog, filesDog, libDog] = dogs;
  // Each tile gets a ring that lights when a dog delivers to it.
  tiles.forEach((t) => {
    const u = t.g.querySelector('use'), r = document.createElementNS(NS, 'rect');
    for (const [k, v] of Object.entries({ x: +u.getAttribute('x') - 2.5, y: +u.getAttribute('y') - 2.5, width: 29, height: 29, rx: 8, class: 'fl-ring' })) r.setAttribute(k, v);
    t.g.append(r);
    t.ring = r;
  });
  const big = $('#fl-big'), hole = $('#fl-hole'), sheen = $('#fl-sheen'), ticks = $$('.fl-tick'), scrs = $$('.fl-scr');
  const typing = $('#fl-typing'), bubw = $('#fl-bubw'), envArt = $('#fl-env-art'), envFlap = $('#fl-env-flap'), envShut = $('#fl-env-shut'), envSeal = $('#fl-env-seal'), shelf = $('#fl-shelf'), ask = $('#fl-ask');
  const NAMES = ['ask', 'ticket', 'scope', 'rail', 'build', 'fit', 'deliver'];
  // "Not quite right" asks: each job deals its update texts shuffled, every one before any repeats, and never the same
  // text twice running. Each text names the change kind its picture makes.
  const decks = jobs.map(() => []), lastAsk = jobs.map(() => '');
  const deal = (j) => {
    if (!decks[j].length) {
      const all = Object.entries(jobs[j].asks).flatMap(([k, ts]) => ts.map((t) => ({ k, t })));
      for (let n = all.length - 1; n > 0; n--) { const r = R(n + 1); [all[n], all[r]] = [all[r], all[n]]; }
      if (all[all.length - 1].t === lastAsk[j]) all.unshift(all.pop()); // dealt from the end
      decks[j] = all;
    }
    const a = decks[j].pop();
    lastAsk[j] = a.t;
    return a;
  };
  // The ask bubble fits its text: its body runs from the text's start to the tail at 0.
  const askSay = (t) => {
    const txt = ask.querySelector('text');
    txt.textContent = t;
    const x0 = -Math.ceil(txt.getComputedTextLength() + 22);
    txt.setAttribute('x', x0 - 3);
    ask.querySelector('path').setAttribute('d', `M${x0} -13H-25a13 13 0 0 1 12 8l13 5-13 5a13 13 0 0 1-12 8H${x0}a13 13 0 0 1 0-26z`);
  };

  // Geometry shared with the SVG. Stations on the spine; the pieces' places (scope row, assembled sheet, Rail at half
  // size, finished piece at 1.2); each piece turns about the centre of its quarter.
  const NY = [46, 119, 202, 298, 494, 693, 803];
  const ROW = [[234, 179], [258, 184.5], [384, 149.5], [407.5, 155]], SHEET = [321, 167], F = [236, 651];
  // Rail: each piece at half size on its slip, the quarter's top-centre 27 below its clip.
  const RAIL = [[182, 299], [226, 299], [326, 281.5], [370, 281.5]], CLIPX = [196, 268, 340, 412];
  const CEN = [[28, 17.5], [84, 17.5], [28, 52.5], [84, 52.5]], CREW = [0, 1, 2, 2];
  // Where the dogs deliver: the bottom-row tile centres of each crew (x, picture units; the row's centre is y 486) and
  // which way each dog faces there. DOG is the dogs' drawn scale (read from the markup); what a dog carries is centred
  // MOUTH ahead of its feet and up, and it hands it up into the tile from REACH below the tile's centre. GUT is where
  // the Rail dog's feet run down the gutter between the second and third crews, its slip clear of both crews' tiles.
  const DOG = svg.querySelector('.fl-dp > g').transform.baseVal.consolidate().matrix.a;
  const CREW0 = [62, 228, 394], TILEY = 486, MOUTH = [24 * DOG, 14 * DOG], REACH = 40, GUT = 362;
  const DROP = { files: [[0, 1, -1], [1, 2, 1], [2, 0, 1]], lib: [[0, 2, -1], [1, 2, -1], [2, 1, -1]] }; // [crew, tile 0-2, facing]
  const PT =(i, [x, y], s = 1, r = 0) => `translate(${x}px, ${y}px) scale(${s}) translate(${CEN[i][0]}px, ${CEN[i][1]}px) rotate(${r}deg) translate(${-CEN[i][0]}px, ${-CEN[i][1]}px)`;
  const TT = (y, x = 28, r = 90, s = 0.085, tx = -290) => `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s}) translate(${tx}px, 0px)`;
  const ECHO = [[-310, -40, 1], [-306.36, -82.51, 0.88], [-302.35, -129.27, 0.748], [-298.26, -176.96, 0.6134], [-294.35, -222.58, 0.4846]];
  const corr = (i, f) => {
    const [tx, ty, s] = ECHO[i], k = 1 / s;
    return ` translate(${(-310 - tx * k) * (1 - f)}px, ${(-40 - ty * k) * (1 - f)}px) scale(${k + (1 - k) * f})`;
  };
  const TE = (i, f, ...t) => TT(...t) + corr(i, f), REST = 0.35;
  const MARKE = (i) => TE(i, 1, NY[6] + 18, 458, 0, 0.2, 0), NONE = 'translate(0px, 0px)';
  const pf = (y) => `scaleY(${Math.max(0.0001, (y - NY[0]) / (NY[6] - NY[0]))})`;
  const E = 'cubic-bezier(.45,0,.2,1)', POP = 'cubic-bezier(.3,1.45,.55,1)', SETTLE = 'cubic-bezier(.34,1.25,.5,1)';
  const TRAVEL = 'cubic-bezier(.55,0,.3,1.12)', SWAY = 'cubic-bezier(.45,0,.55,1)';
  let speed = 1, token = 0, job = 0, state = jobs[0].start, rounds = 1, lastKey = '', picked = false, started = false;
  let active = 0, inView = false, tokY = 46;
  // The pop-out card: shown once the job is delivered, while the flow is on screen, until the visitor answers.
  const card = $('.fl-card'), perfect = $('.fl-perfect');
  let ready = false, answered = false, perfectDone = false, rounding = false, follow = null;
  const cardSync = () => { card.hidden = !(ready && !answered && !perfectDone && (inView || still)); };
  // On a phone, the page follows the job while a round the visitor asked for plays, until they scroll or touch.
  // It keeps the job (where the spine's red line has got to) between 30% and 72% of the screen's height.
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((t) => addEventListener(t, () => (follow = null), { passive: true }));
  const chase = () => {
    if (follow) return;
    follow = true;
    const step = () => {
      if (!follow) return;
      const r = svg.getBoundingClientRect(), f = new DOMMatrix(getComputedStyle(progw).transform).d;
      const y = r.top + (NY[0] + f * (NY[6] - NY[0])) * r.height / svg.viewBox.baseVal.height;
      const dy = y - Math.min(Math.max(y, innerHeight * 0.3), innerHeight * 0.72); // only when it nears an edge
      if (Math.abs(dy) > 2) scrollBy({ top: dy * 0.16, behavior: 'instant' });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const tv = tvs.map(() => ({ p: [0, 0], s: 1, r: 0 }));

  const A = (el, kf, d, o = {}) => el.animate(kf, { easing: E, fill: 'backwards', ...o, duration: d * speed, delay: (o.delay || 0) * speed });
  const wait = (ms) => A(timer, [{ opacity: 1 }, { opacity: 1 }], ms).finished;
  const all = (list) => Promise.all(list.map((a) => (a.finished ? a.finished : a)));
  const stop = () => { svg.getAnimations({ subtree: true }).forEach((a) => a.cancel()); fly.textContent = ''; };
  const hold = () => {
    const on = inView && !document.hidden;
    svg.getAnimations({ subtree: true }).forEach((a) => (on ? a.playState === 'paused' && a.play() : a.playState === 'running' && a.pause()));
  };
  const draw = () => { art.innerHTML = jobs[job].art(state); };
  const fade = (el, a, b, d, o) => { el.style.opacity = b; return A(el, [{ opacity: a }, { opacity: b }], d, o); };
  const pop = (el, d = 420, o, peak = 1.25) => A(el, [{ transform: 'scale(0)' }, { transform: `scale(${peak})`, offset: 0.6 }, { transform: 'scale(1)' }], d, { easing: 'ease-out', ...o });
  const pulse = (el, d, o) => A(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(.97)' }, { transform: 'scale(1)' }], d, { easing: 'ease-in-out', ...o });
  const blink = (k, delay) => {
    A(eyes[k], [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.1)', offset: 0.5 }, { transform: 'scaleY(1)' }], 200, { delay, iterations: 2, easing: 'ease-in-out' });
    A(leds[k], [{ transform: 'scale(1)' }, { transform: 'scale(1.55)' }, { transform: 'scale(1)' }], 580, { delay, iterations: 2, easing: 'ease-in-out' });
  };
  const tvSet = (i, p, s = 1, r = 0) => { tv[i] = { p, s, r }; tvs[i].style.transform = PT(i, p, s, r); };
  const tvGo = (i, keys, d, o) => {
    const f = tv[i], kf = [{ transform: PT(i, f.p, f.s, f.r) }];
    keys.forEach(([p, s, r, offset]) => kf.push(offset == null ? { transform: PT(i, p, s, r) } : { transform: PT(i, p, s, r), offset }));
    const [p, s, r] = keys[keys.length - 1];
    tvSet(i, p, s, r);
    return A(tvs[i], kf, d, o);
  };
  const tvShow = (i, p, s, inkOp, href = '#fl-art') => {
    tvSet(i, p, s, 0);
    tvs[i].style.opacity = 1; ink(tvs[i]).style.opacity = inkOp; tvo(tvs[i]).style.opacity = 1;
    artUse(tvs[i]).setAttribute('href', href);
  };
  const go = (k, d = 600) => {
    const y0 = tokY, y1 = NY[k];
    tokY = y1;
    progw.style.transform = pf(y1);
    A(progw, [{ transform: pf(y0) }, { transform: pf(y1) }], d, { easing: TRAVEL });
    nfs.forEach((n, j) => { if (j < k && NY[j] > y0 && n.style.opacity !== '1') fade(n, 0, 1, 150, { delay: d * 0.6 * (NY[j] - y0) / (y1 - y0) }); });
    nfs[k].style.opacity = 1;
    pop(nfs[k], 380, { delay: d * 0.78 }, 1.5);
    return all(tes.map((e, i) => {
      e.style.transform = TE(i, REST, y1);
      return A(e, [{ transform: TE(i, REST, y0), easing: 'cubic-bezier(.55,0,.8,.6)' }, { transform: TE(i, 1, y0 + (y1 - y0) * 0.45), offset: 0.45, easing: 'cubic-bezier(.2,.4,.3,1.12)' }, { transform: TE(i, REST, y1) }], d + i * 38, { delay: i * 56, easing: 'linear' });
    }));
  };
  const clockOn = () => {
    if (hands[0].getAnimations().some((a) => a.playState === 'running')) return;
    hands.forEach((h, j) => A(h, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], j ? 9600 : 1600, { easing: 'linear', iterations: Infinity }));
  };
  const clockOff = () => hands.forEach((h) => h.getAnimations().forEach((a) => { try { a.commitStyles(); } catch (e) { /* not rendered */ } a.cancel(); }));

  const pose = (k) => {
    fly.textContent = '';
    draw();
    tokY = NY[Math.max(0, Math.min(k, 6))];
    tes.forEach((e, i) => { e.style.transform = k >= 6 ? MARKE(i) : TE(i, REST, tokY); e.style.opacity = k < 0 ? 0 : 1; });
    progw.style.transform = k < 0 ? pf(46) : pf(tokY);
    backOn.style.opacity = 0;
    nfs.forEach((n, j) => { n.style.opacity = j <= k ? 1 : 0; n.style.transform = 'none'; });
    tkw.style.opacity = k < 1 ? 0 : 1;
    tkw.style.transform = 'none';
    tk.style.opacity = 1;
    tkCover.style.transform = k < 1 ? 'scaleX(1)' : 'scaleX(0)';
    tkPen.style.opacity = 0;
    tkBand.style.transform = k < 1 ? 'scaleY(0)' : 'none';
    tkLines.forEach((l) => (l.style.transform = k < 1 ? 'scaleX(0)' : 'none'));
    scp.forEach((p) => { p.style.opacity = k < 2 ? 0 : 1; ink(p).style.opacity = 0.15; });
    rps.forEach((p, i) => {
      p.style.opacity = k === 3 || k === 4 ? 1 : 0;
      p.style.transform = 'none';
      p.style.transformOrigin = `${CLIPX[i]}px 268px`;
      ink(p).style.opacity = k < 4 ? 0.15 : 1;
      artUse(p).setAttribute('href', '#fl-art');
    });
    clips.forEach((c) => (c.style.transform = 'none'));
    tvs.forEach((t) => (t.style.opacity = 0));
    sheet.style.opacity = 0;
    cutw.style.opacity = 0;
    cuth.style.opacity = 0;
    hands.forEach((h) => (h.style.transform = 'none'));
    pgs.forEach((b) => (b.style.transform = `scaleX(${k < 4 ? 0 : 1})`));
    tiles.forEach((t) => { t.g.style.transform = 'none'; t.dot.style.transform = 'none'; });
    dogs.forEach((d) => { [d.x, d.y, d.f, d.p, d.tail, d.hind, d.fore, d.head, d.carry].forEach((el) => (el.style.transform = 'none')); d.carry.style.opacity = 0; });
    tiles.forEach((t) => (t.ring.style.opacity = 0));
    big.style.opacity = k < 5 ? 0 : 1;
    big.style.transform = 'none';
    hole.style.opacity = 0;
    [...scrs, ...ticks].forEach((el) => { el.style.opacity = k < 5 ? 0 : 1; el.style.transform = 'none'; });
    typing.style.opacity = 0;
    bubw.style.opacity = k < 6 ? 0 : 1;
    // Envelope: closed and sealed during stages 0..5, open with risen draft at stage 6
    envFlap.style.transform = k < 6 ? 'scaleY(0)' : 'scaleY(1)';
    envShut.style.opacity = k < 6 ? 1 : 0;
    envShut.style.transform = k < 6 ? 'scaleY(1)' : 'scaleY(0)';
    envSeal.style.opacity = k < 6 ? 1 : 0;
    envSeal.style.transform = 'none';
    envArt.style.opacity = k < 6 ? 0 : 1;
    envArt.style.transform = k < 6 ? 'translate(0px, 44px)' : NONE;
    ask.style.opacity = 0;
    ready = k >= 6;
    cardSync();
  };
  const setAt = (k, self) => {
    svg.dataset.at = NAMES[k];
    caps.forEach((c, i) => c.classList.toggle('on', i === k));
    dots.forEach((d, i) => (i === k ? d.setAttribute('aria-current', 'step') : d.removeAttribute('aria-current')));
    if (self) say.textContent = caps[k].querySelector('strong').textContent;
  };

  const swing = (i, deg = 14, d = 1200, delay = 0) => A(rps[i], [0, deg, -deg * 0.62, deg * 0.36, -deg * 0.18, deg * 0.07, 0].map((r) => ({ transform: `rotate(${r}deg)`, easing: SWAY })), d, { easing: 'linear', delay });
  const nip = (i, delay = 0) => A(clips[i], [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.72) translateY(1.5px)', offset: 0.35 }, { transform: 'scaleY(1.12)', offset: 0.72 }, { transform: 'scaleY(1)' }], 320, { delay, easing: 'ease-out' });

  const dust = (x, y, delay, dir = 1) => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('r', 2.4);
    c.setAttribute('class', 'fl-dust');
    c.style.opacity = 0;
    fly.append(c);
    return A(c, [
      { transform: `translate(${x}px, ${y - 1}px) scale(.4)`, opacity: 0.55 },
      { transform: `translate(${x - 14 * dir}px, ${y - 8}px) scale(1.5)`, opacity: 0 },
    ], 460, { delay, easing: 'ease-out' });
  };

  const work = (from, to, only) => {
    const list = [];
    benches.forEach((ps, b) => {
      if (only != null && b !== only) return;
      ps.forEach((t) => list.push(A(t.dot, [{ transform: 'scale(1)' }, { transform: 'scale(1.85)' }, { transform: 'scale(1)' }], 800, { delay: from + R(800), iterations: Math.max(1, Math.floor((to - from - 800) / 800)), easing: 'ease-in-out' })));
      let t = from + b * 230;
      for (let n = 0; t < to - 700; n++, t += 260 + R(240)) {
        const p = ps[(n * 5 + b) % ps.length], lean = n % 2 ? 4 : -4;
        list.push(A(p.g, [{ transform: NONE }, { transform: `translate(${lean / 4}px, -1.4px) rotate(${lean / 3}deg)`, offset: 0.3 }, { transform: `translate(${-lean / 8}px, .4px) rotate(${-lean / 6}deg)`, offset: 0.7 }, { transform: NONE }], 520, { delay: t, easing: 'ease-in-out', fill: 'none' }));
      }
    });
    return all(list);
  };

  // Sheepdogs. A bounding gait: hind and fore pairs swing in turn, the body leaps and pitches with each stride (higher
  // when the run is mostly up or down the picture).
  const leg = (s) => [0, s, 0, -s, 0].map((r) => ({ transform: `rotate(${r}deg)`, easing: 'ease-in-out' }));
  const gallop = (d, ms, delay, tall) => {
    const per = 300, n = ms / per, o = { delay, iterations: n, fill: 'none' };
    return [
      A(d.hind, leg(32), per, { ...o, easing: 'linear' }),
      A(d.fore, leg(-32), per, { ...o, easing: 'linear' }),
      A(d.y, [{ transform: NONE, easing: 'cubic-bezier(.2,.6,.4,1)' }, { transform: `translate(0px, ${tall ? -6.5 : -4.5}px)`, easing: 'cubic-bezier(.6,0,.8,.4)' }, { transform: NONE }], per, { ...o, easing: 'linear' }),
      A(d.p, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-8deg)', offset: 0.3 }, { transform: 'rotate(5deg)', offset: 0.72 }, { transform: 'rotate(0deg)' }], per, { ...o, easing: 'ease-in-out' }),
    ];
  };
  // A leg is [x, y, ms, face]: the dog bounds to (x, y) (its feet, in picture units) in ms, first turning to face
  // (1 right, -1 left) if given, else the way it runs. Every errand starts and ends at home, facing right.
  const bound = (d, legs, delay) => {
    const list = [], kf = [{ transform: NONE, offset: 0 }], T = legs.reduce((s, l) => s + l[2], 0);
    let t = 0, x = d.hx, y = d.hy, face = 1;
    // A turn is a little hop with the flip at its top, in one step: the dog is never drawn edge-on.
    const turnTo = (f) => {
      if (f === face) return;
      const at = (s, y) => ({ transform: `translate(0px, ${y}px) scaleX(${s})` });
      list.push(A(d.f, [{ ...at(face, 0), easing: 'cubic-bezier(.2,.7,.4,1)' }, { ...at(face, -5), offset: 0.5 }, { ...at(f, -5), offset: 0.5, easing: 'cubic-bezier(.6,0,.8,.3)' }, at(f, 0)], 190, { delay: delay + t, fill: 'forwards', easing: 'linear' }));
      face = f;
    };
    for (const [nx, ny, ms, f] of legs) {
      const run = Math.hypot(nx - x, ny - y) > 1;
      turnTo(f || (Math.abs(nx - x) > 4 ? Math.sign(nx - x) : face));
      if (run) list.push(...gallop(d, ms, delay + t, Math.abs(ny - y) > Math.abs(nx - x)));
      kf[kf.length - 1].easing = run ? 'cubic-bezier(.42,0,.35,1)' : 'linear';
      t += ms; x = nx; y = ny;
      kf.push({ transform: `translate(${x - d.hx}px, ${y - d.hy}px)`, offset: t / T });
    }
    turnTo(1);
    list.push(A(d.x, kf, T, { delay, fill: 'forwards', easing: 'linear' }));
    return list;
  };
  // What a dog carries pops into its mouth, and hops off it by (dx, dy) in the dog's own units (DOG of the picture's).
  const take = (d, delay, dx = 0, dy = 0) => A(d.carry, [{ opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.3)` }, { opacity: 1, transform: 'scale(1.18)', offset: 0.6 }, { opacity: 1, transform: NONE }], 280, { delay, fill: 'forwards', easing: 'ease-out' });
  const give = (d, delay, dx = 0, dy = 0) => A(d.carry, [{ opacity: 1, transform: NONE }, { opacity: 1, transform: `translate(${dx * 0.7}px, ${dy * 0.7 - 6}px) scale(.8)`, offset: 0.6 }, { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.3)` }], 320, { delay, fill: 'forwards', easing: 'ease-in' });
  // The tile that receives a delivery lights: a gold ring, a hop, a bright dot.
  const light = (t, delay) => [
    A(t.ring, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1.1)', offset: 0.3 }, { opacity: 0, transform: 'scale(1.35)' }], 760, { delay, easing: 'ease-out' }),
    A(t.g, [{ transform: 'scale(1)' }, { transform: 'scale(1.22)', offset: 0.4 }, { transform: 'scale(1)' }], 420, { delay, easing: 'ease-out', fill: 'none' }),
    A(t.dot, [{ transform: 'scale(1)' }, { transform: 'scale(2.1)' }, { transform: 'scale(1)' }], 460, { delay: delay + 80, fill: 'none' }),
  ];
  // The files dog takes a folder from your files, the Library dog a book from The Library, up to crew c (never to the
  // other store), hands it to a tile from below and comes home. k scales the timing for the quicker "Not quite right" round.
  const errand = (d, c, delay, k = 1) => {
    const files = d === filesDog, [, n, face] = (files ? DROP.files : DROP.lib)[c], tx = CREW0[c] + 30 + 32 * n, X = tx - face * MOUTH[0];
    const legs = [[files ? 279 : d.hx, d.hy, (files ? 320 : 160) * k, 1], [X, TILEY + REACH + MOUTH[1], 650 * k, face], [X, TILEY + REACH + MOUTH[1], 160 * k], [d.hx, d.hy, 560 * k]];
    const tGrab = delay + legs[0][2], tGive = tGrab + legs[1][2];
    const list = [...bound(d, legs, delay), take(d, tGrab - 120 * k, 0, 22), give(d, tGive, 0, -REACH / DOG), ...light(benches[c].at(n - 3), tGive + 200), dust(legs[0][0] - 10 * face, d.hy, tGrab, face)];
    list.push(files
      ? A(lock, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.45 }, { transform: 'scale(1)' }], 360, { delay: tGrab - 200 * k, easing: 'ease-out', fill: 'none' })
      : A(shelf.querySelector('rect:nth-child(4)'), [{ transform: NONE }, { transform: 'translate(0px, -9px)', offset: 0.4 }, { transform: NONE }], 420, { delay: tGrab - 260 * k, easing: 'ease-in-out', fill: 'none' }));
    return list;
  };
  // The Rail dog fetches the last slip off The Rail, runs it down the gutter to its crew, then brings it back built.
  // It faces right the whole time it carries the slip, so the handwriting never shows mirrored; it leaps up under the
  // slip and the slip jumps from its clip into its mouth (and back the same way).
  const railRun = (delay) => {
    const d = railDog, i = 3, tile = benches[CREW[i]][3], up = [GUT, 372], clip = [GUT, 350], low = [GUT, 470];
    write(d.carry.querySelector('.fl-word'), jobs[job].crews[CREW[i]]);
    const legs = [[...up, 700, 1], [...clip, 220, 1], [...clip, 160], [...up, 220, 1], [...low, 420, 1], [...low, 1500], [...up, 520, 1], [...clip, 220, 1], [...clip, 200], [d.hx, d.hy, 900]];
    const at = (n) => delay + legs.slice(0, n).reduce((s, l) => s + l[2], 0), hop = (CREW0[CREW[i]] + 30 - low[0] - MOUTH[0]) / DOG, reach = (CLIPX[i] - clip[0] - MOUTH[0]) / DOG;
    return [
      ...bound(d, legs, delay), dust(d.hx - 10, d.hy, delay),
      take(d, at(2) - 60, reach, -10), A(rps[i], [{ opacity: 1 }, { opacity: 0 }], 140, { delay: at(2) - 60, fill: 'forwards' }), nip(i, at(2) - 80),
      give(d, at(5), hop, 0), ...light(tile, at(5) + 200),
      take(d, at(6) - 200, hop, 0), ...light(tile, at(6) - 260),
      give(d, at(8), reach, -10), A(rps[i], [{ opacity: 0 }, { opacity: 1 }], 140, { delay: at(8) + 60, fill: 'forwards' }), nip(i, at(8)), swing(i, 14, 1100, at(8) + 60),
      A(d.tail, [0, 34, -6, 34, -4, 0].map((r) => ({ transform: `rotate(${r}deg)` })), 620, { delay: at(9), easing: 'ease-in-out', fill: 'none' }),
    ];
  };

  const addCard = () => {
    const sh = 8, list = [];
    [...shelf.querySelectorAll('rect')].forEach((s) => {
      const x = +s.getAttribute('x') - sh;
      s.setAttribute('x', x);
      if (x < 448) {
        s.style.opacity = 0;
        A(s, [{ transform: `translate(${sh}px, 0px)`, opacity: 1 }, { transform: 'translate(-4px, 3px) rotate(-30deg)', opacity: 0 }], 450).finished.then(() => s.remove(), () => s.remove());
      } else list.push(A(s, [{ transform: `translate(${sh}px, 0px)` }, { transform: NONE }], 450, { easing: SETTLE }));
    });
    const h = 15 + R(8), c = document.createElementNS(NS, 'rect');
    for (const [k, v] of Object.entries({ x: 502, y: 616 - h, width: 6, height: h, rx: 1, class: 'b1' })) c.setAttribute(k, v);
    shelf.append(c);
    list.push(A(c, [{ transform: 'translate(12px, -18px) rotate(25deg)', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'translate(0px, 2px) rotate(-3deg)', offset: 0.78 }, { transform: NONE }], 720, { delay: 180, easing: 'ease-out' }));
    const g = document.createElementNS(NS, 'path');
    g.setAttribute('d', `M505 ${610 - h}l1.2 3.8 3.8 1.2-3.8 1.2-1.2 3.8-1.2-3.8-3.8-1.2 3.8-1.2z`);
    g.setAttribute('class', 'fl-glint');
    fly.append(g);
    g.style.opacity = 0;
    list.push(A(g, [{ transform: 'scale(0) rotate(0deg)', opacity: 1 }, { transform: 'scale(1.6) rotate(45deg)', opacity: 1, offset: 0.4 }, { transform: 'scale(0) rotate(90deg)', opacity: 1 }], 580, { delay: 740, easing: 'ease-out' }));
    return all(list);
  };
  const sheenOn = (delay) => A(sheen, [{ transform: NONE, opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { transform: 'translate(200px, 0px)', opacity: 0 }], 680, { delay, easing: 'ease-in-out' });
  const tested = (delay) => {
    ticks.forEach((t, j) => { t.style.opacity = 1; pop(t, 420, { delay: delay + j * 260 }); });
    scrs.forEach((s, j) => fade(s, 0, 1, 250, { delay: delay + 110 + j * 260 }));
  };

  // Opens the sealed delivery envelope in 3D: seal pops, front flap lifts to 90deg, back flap opens to 180deg, draft rises.
  const openEnvelope = (delay = 1150) => {
    A(envSeal, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.38)', opacity: 1, offset: 0.55 }, { transform: 'scale(0)', opacity: 0 }], 240, { delay, easing: POP, fill: 'forwards' });
    A(envShut, [{ transform: 'scaleY(1)', opacity: 1 }, { transform: 'scaleY(0)', opacity: 1, offset: 0.92 }, { transform: 'scaleY(0)', opacity: 0 }], 230, { delay: delay + 110, easing: 'ease-in', fill: 'forwards' });
    envFlap.style.transform = 'scaleY(1)';
    A(envFlap, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1.07)', offset: 0.76 }, { transform: 'scaleY(1)' }], 290, { delay: delay + 320, easing: SETTLE });
    envArt.style.opacity = 1;
    envArt.style.transform = NONE;
    return A(envArt, [
      { transform: 'translate(0px, 44px) scale(.95)', opacity: 0 },
      { opacity: 1, offset: 0.2 },
      { transform: 'translate(0px, -4.5px) scale(1.015)', opacity: 1, offset: 0.78 },
      { transform: NONE, opacity: 1 },
    ], 760, { delay: delay + 380, easing: SETTLE });
  };

  // The glowing nib writes the ticket title: the cover wipes off it left to right in d, the pen riding its edge.
  const nib = (d, delay = 0) => {
    tkCover.style.transform = 'scaleX(0)';
    A(tkCover, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], d, { delay, easing: 'cubic-bezier(.35,0,.6,1)' });
    return A(tkPen, [{ transform: 'translate(0px, 0px) scale(.5)', opacity: 0 }, { opacity: 1, offset: 0.12 }, { transform: 'translate(212px, 0px) scale(1)', opacity: 1, offset: 0.88 }, { transform: 'translate(222px, 0px) scale(.3)', opacity: 0 }], d + 20, { delay: delay - 10, easing: 'cubic-bezier(.35,0,.6,1)' });
  };

  const STAGES = [
    // 1 You: the chip pulses, the waveform breathes, the job drops onto the first node and its echoes fan out.
    async (at) => {
      pulse(chips[0], 680, { delay: 80 });
      waves.forEach((b, i) => A(b, [1, 0.32, 1.34, 0.55, 1].map((s) => ({ transform: `scaleY(${s})` })), 860, { delay: i * 55, iterations: 2, easing: 'ease-in-out' }));
      tokY = 46;
      nfs[0].style.opacity = 1;
      pop(nfs[0], 380, { delay: 820 }, 1.5);
      await at(all(tes.map((e, i) => {
        e.style.opacity = 1;
        e.style.transform = TE(i, REST, 46);
        return A(e, [{ transform: TE(i, REST, 10), opacity: 0 }, { opacity: 1, offset: 0.4 }, { transform: TE(i, REST, 46), opacity: 1 }], 560, { delay: 260, easing: TRAVEL });
      })));
      await at(all(tes.map((e, i) => A(e, [{ transform: TE(i, REST, 46) }, { transform: TE(i, 1, 46), offset: 0.36 }, { transform: TE(i, 1, 46), offset: 0.62 }, { transform: TE(i, REST, 46) }], 940, { delay: i * 46, easing: 'ease-in-out' }))));
    },
    // 2 Your team lead: the agent blinks; the ticket slides out and a glowing crimson nib writes the title across.
    async (at) => {
      const g = go(1);
      blink(0, 260);
      tkw.style.opacity = 1;
      A(tkw, [{ transform: 'translate(-158px, -4px) scale(.16)', opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'translate(0px, 0px) scale(1)', opacity: 1 }], 580, { delay: 360, easing: SETTLE });
      tkBand.style.transform = 'none';
      A(tkBand, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], 250, { delay: 880 });
      nib(620, 1020);
      tkLines.forEach((l, i) => { l.style.transform = 'none'; A(l, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 300, { delay: 1560 + i * 140 }); });
      await at(g);
      await at(wait(1480));
    },
    // 3 Project lead: blueprint peels from the ticket onto the cutting mat, vertical + horizontal laser cuts quarter it.
    async (at) => {
      const g = go(2);
      blink(1, 280);
      tvs.forEach((t, i) => {
        tvShow(i, SHEET, 1, 0.15);
        tvo(t).style.opacity = 0;
        A(t, [{ opacity: 0, transform: PT(i, [321, 118], 0.78, 0) }, { opacity: 1, transform: PT(i, SHEET, 1, 0) }], 420, { delay: 280, easing: SETTLE });
      });
      sheet.style.opacity = 0;
      A(sheet, [{ opacity: 0 }, { opacity: 1, offset: 0.22 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], 1220, { delay: 320, easing: 'linear' });
      cutw.style.opacity = 0;
      A(cutw, [{ transform: NONE, opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.88 }, { transform: 'translate(112px, 0px)', opacity: 0 }], 640, { delay: 720, easing: 'cubic-bezier(.5,0,.5,1)' });
      cuth.style.opacity = 0;
      A(cuth, [{ transform: NONE, opacity: 0 }, { opacity: 1, offset: 0.14 }, { opacity: 1, offset: 0.86 }, { transform: 'translate(0px, 70px)', opacity: 0 }], 600, { delay: 780, easing: 'cubic-bezier(.5,0,.5,1)' });
      tvs.forEach((t, i) => fade(tvo(t), 0, 1, 220, { delay: 760 + (i % 2 ? 0.68 : 0.32) * 640 }));
      await at(g);
      await at(wait(880));
      await at(all(tvs.map((t, i) => tvGo(i, [[ROW[i], 1.04, i % 2 ? 5.5 : -5.5, 0.64], [ROW[i], 1, 0]], 740, { delay: i * 80, easing: SETTLE }))));
      scp.forEach((p) => { p.style.opacity = 1; ink(p).style.opacity = 0.15; });
      tvs.forEach((t) => (t.style.opacity = 0));
    },
    // 4 The Rail (about 16% quicker than round 1): each piece arcs to its clip on an order slip, the clip nips shut,
    // and the slip swings as it lands.
    async (at) => {
      const g = go(3, 470);
      clockOn();
      await at(Promise.all([g, ...tvs.map(async (t, i) => {
        tvShow(i, ROW[i], 1, 0.15);
        const [x0, y0] = ROW[i], [x1, y1] = RAIL[i];
        await at(tvGo(i, [[[(x0 + x1) / 2 + 12, (y0 + y1) / 2 - 16], 0.72, i % 2 ? 10 : -10, 0.5], [RAIL[i], 0.5, 0]], 620, { delay: 185 + i * 122, easing: E }).finished);
        t.style.opacity = 0;
        fade(rps[i], 0, 1, 90);
        nip(i);
        swing(i, 16, 1100);
      })]));
      await at(wait(320));
    },
    // 5 Build: pieces fill with colour while the three sheepdogs fetch and carry.
    async (at) => {
      const L = 6250, g = go(4, 580);
      clockOn();
      const plan = [[[0, 0], [600, 0], [5100, 1], [L, 1]], [[0, 0], [600, 0], [1700, 0.45], [4750, 0.45], [5250, 1], [L, 1]], [[0, 0], [700, 0], [5000, 1], [L, 1]], [[0, 0], [900, 0], [5300, 1], [L, 1]]];
      const list = [g, work(450, 5600)];
      plan.forEach((keys, j) => {
        pgs[j].style.transform = 'scaleX(1)';
        list.push(A(pgs[j], keys.map(([t, f]) => ({ transform: `scaleX(${f})`, offset: t / L, easing: 'ease-in-out' })), L, { easing: 'linear' }));
        ink(rps[j]).style.opacity = 1;
        list.push(A(ink(rps[j]), keys.map(([t, f]) => ({ opacity: 0.15 + 0.85 * f, offset: t / L, easing: 'ease-in-out' })), L, { easing: 'linear' }));
      });
      // The dogs: the Rail dog fetches a slip down to its crew and brings it back built; the files dog runs folders up
      // from your files and the Library dog books up from The Library, two trips each.
      list.push(...railRun(300), ...errand(filesDog, 0, 500), ...errand(libDog, 2, 900), ...errand(filesDog, 1, 2700), ...errand(libDog, 1, 3200));
      dogs.forEach((d, j) => list.push(A(d.tail, [0, 40, 22, 44, 26, 0].map((r) => ({ transform: `rotate(${r}deg)` })), 900, { delay: 120 + j * 140, easing: 'ease-in-out', fill: 'none' })));
      await at(Promise.all(list.map((a) => (a.finished ? a.finished : a))));
      rps.forEach((p) => p.getAnimations().forEach((a) => a.cancel())); // the slip the Rail dog carried is back on its clip
      clockOff();
    },
    // 6 Project lead, fitting: pieces leave the Rail and fit; one backs out, turns and clicks; sheen & device ticks.
    async (at) => {
      const g = go(5, 580), W = 1;
      blink(2, 320);
      rps.forEach((p, i) => { p.style.opacity = 0; tvShow(i, RAIL[i], 0.5, 1); nip(i); });
      await at(Promise.all([g, ...tvs.map(async (t, i) => {
        const [x0, y0] = RAIL[i], mid = [(x0 + F[0]) / 2 + 30, (y0 + F[1]) / 2];
        if (i !== W) return at(tvGo(i, [[mid, 0.9, i % 2 ? 8 : -8, 0.5], [F, 1.2, 0]], 820, { delay: 220 + (i > W ? i - 1 : i) * 135, easing: SETTLE }).finished);
        const near = [F[0] + 18, F[1] - 16];
        await at(tvGo(i, [[mid, 0.9, 90, 0.5], [near, 1.2, 180]], 780, { delay: 490, easing: E }).finished);
        await at(A(tvs[i], [0, -5, 4, -3, 0].map((dx) => ({ transform: PT(i, [near[0] + dx, near[1]], 1.2, 180) })), 290, { easing: 'ease-in-out' }).finished);
        await at(tvGo(i, [[[F[0] + 30, F[1] - 26], 1.2, 0]], 400, { easing: E }).finished);
        await at(tvGo(i, [[F, 1.2, 0]], 360, { easing: POP }).finished);
      })]));
      tvs.forEach((t) => fade(tvo(t), 1, 0, 220));
      await at(wait(190));
      tvs.forEach((t) => (t.style.opacity = 0));
      big.style.opacity = 1;
      A(big, [{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }, { transform: 'scale(1)' }], 260, { easing: 'ease-out' });
      sheenOn(130);
      tested(660);
      await at(wait(1420));
    },
    // 7 You: typing dots, bubble, sealed envelope pops open & finished piece rises, five-echo mark fans out, new Library card.
    async (at) => {
      const g = go(6, 580);
      pulse(chips[1], 680, { delay: 420 });
      A(typing, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)', offset: 0.15 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], 900, { delay: 500 });
      [...typing.querySelectorAll('.fl-tdot')].forEach((c, i) => A(c, [{ transform: NONE }, { transform: 'translate(0px, -3.2px)' }, { transform: NONE }], 330, { delay: 600 + i * 105, iterations: 2, easing: 'ease-in-out' }));
      bubw.style.opacity = 1;
      A(bubw, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], 440, { delay: 1360, easing: 'ease-out' });
      openEnvelope(1080);
      await at(g);
      await at(all(tes.map((e, i) => { e.style.transform = MARKE(i); return A(e, [{ transform: TE(i, REST, NY[6]) }, { transform: MARKE(i) }], 820, { delay: 1240 + i * 85, easing: SETTLE }); })));
      ready = true; answered = false;
      cardSync();
      await at(addCard());
    },
  ];

  const run = async (from, until) => {
    const my = ++token, at = async (p) => { const v = await p; if (my !== token) throw 0; return v; };
    stop(); speed = 0.75; rounding = false; follow = null; pose(from - 1); again.disabled = false;
    tkTitle.textContent = jobs[job].title; // a replay tells the job from its own ask
    try {
      for (let k = from; k <= until; k++) { setAt(k, k > from && !wide.matches); await STAGES[k](at); }
      if (until === 6 && !wide.matches) { await at(wait(6000)); if (!perfectDone) round(); }
    } catch (e) { if (e !== 0 && e.name !== 'AbortError') throw e; }
  };

  // "Not quite right": illuminated return pulse & ask bubble ride up to team lead; only the changed piece goes round.
  // asked: the visitor pressed the button (then a phone follows the job); the phone's own replay does not scroll.
  const round = async (asked) => {
    const my = ++token, at = async (p) => { const v = await p; if (my !== token) throw 0; return v; };
    answered = true;
    stop(); pose(6);
    const want = deal(job);
    let ch;
    do ch = jobs[job].change(state, want.k); while (ch.key === lastKey);
    lastKey = ch.key; rounds++; roundEl.textContent = 'Round ' + rounds;
    askSay(want.t);
    const i = ch.piece, c = CREW[i];
    if (still) { state = ch.s; draw(); tkTitle.textContent = want.t; answered = false; cardSync(); return; }
    again.disabled = true; speed = 0.68; rounding = true;
    if (asked === true && !wide.matches) chase();
    try {
      const D = 1280, a0 = 0.12, a1 = 0.84, ss = (t) => t * t * (3 - 2 * t);
      const inv = (f) => { let lo = 0, hi = 1; for (let n = 0; n < 24; n++) { const m = (lo + hi) / 2; if (ss(m) < f) lo = m; else hi = m; } return lo; };
      const up = (f) => NY[6] - (NY[6] - NY[1]) * f; // the way back, from delivery (f 0) to the ticket (f 1)
      const ride = [{ opacity: 0, transform: `translate(541px, ${NY[6] + 13}px) scale(.5)`, offset: 0 }];
      for (let n = 0; n <= 10; n++) ride.push({ opacity: 1, transform: `translate(541px, ${up(ss(n / 10))}px) scale(1)`, offset: a0 + (a1 - a0) * (n / 10) });
      ride.push({ opacity: 0, transform: 'translate(470px, 119px) scale(.3)', offset: 1 });
      A(ask, ride, D, { easing: 'linear' });
      A(backOn, [{ opacity: 0, strokeDashoffset: 1 }, { opacity: 1, strokeDashoffset: 1, offset: a0 }, { opacity: 1, strokeDashoffset: 0, offset: a1 }, { opacity: 0, strokeDashoffset: 0 }], D, { easing: 'linear' });
      progw.style.transform = pf(119);
      A(progw, Array.from({ length: 11 }, (_, n) => ({ transform: pf(up(ss(n / 10))), offset: n / 10 })), D * (a1 - a0), { delay: D * a0, easing: 'linear' });
      tes.forEach((e) => { e.style.opacity = 0; A(e, [{ opacity: 1 }, { opacity: 0 }], 300); });
      let t0 = 0;
      for (const k of [6, 5, 4, 3, 2, 1]) {
        const t = (a0 + (a1 - a0) * inv((NY[6] - NY[k]) / (NY[6] - NY[1]))) * D;
        await at(wait(t - t0));
        t0 = t;
        svg.dataset.at = NAMES[k];
        if (k > 1) fade(nfs[k], 1, 0, 200);
      }
      await at(wait(D - t0));
      setAt(1);
      tokY = 119;
      tes.forEach((e, idx) => { e.style.transform = TE(idx, REST, 119); fade(e, 0, 1, 300); });
      tkTitle.textContent = want.t; // the ask arrives and the nib writes it as the ticket's new title
      await at(nib(460, 10).finished);
      state = ch.s;
      art2.innerHTML = jobs[job].art(state);
      hole.setAttribute('href', '#fl-p' + i);
      tvShow(i, F, 1.2, 1);
      fade(hole, 0, 1, 200);
      setAt(3);
      clockOn();
      const g3 = go(3, 680);
      fade(ink(tvs[i]), 1, 0.15, 480);
      await at(tvGo(i, [[[F[0] + 120, (F[1] + RAIL[i][1]) / 2], 0.84, 12, 0.5], [RAIL[i], 0.5, 0]], 820, { easing: E }).finished);
      await at(g3);
      tvs[i].style.opacity = 0;
      artUse(rps[i]).setAttribute('href', '#fl-art2');
      ink(rps[i]).style.opacity = 0.15;
      rps[i].style.opacity = 1;
      nip(i);
      swing(i, 11, 960);
      setAt(4);
      const g4 = go(4, 480);
      pgs[i].style.transform = 'scaleX(1)';
      A(pgs[i], [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 1260, { delay: 180, easing: 'ease-in-out' });
      fade(ink(rps[i]), 0.15, 1, 1260, { delay: 180, easing: 'ease-in-out' });
      await at(Promise.all([g4, work(0, 1650, c), ...[...errand(filesDog, c, 60, 0.55), ...errand(libDog, c, 300, 0.55)].map((a) => a.finished)]));
      clockOff();
      setAt(5);
      const g5 = go(5, 580);
      rps[i].style.opacity = 0;
      tvShow(i, RAIL[i], 0.5, 1, '#fl-art2');
      await at(tvGo(i, [[[RAIL[i][0] + 70, (RAIL[i][1] + F[1]) / 2], 0.9, -8, 0.5], [F, 1.2, 0]], 780, { easing: SETTLE }).finished);
      await at(g5);
      draw();
      hole.style.opacity = 0;
      tvs[i].style.opacity = 0;
      A(big, [{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }, { transform: 'scale(1)' }], 260, { easing: 'ease-out' });
      sheenOn(100);
      tested(480);
      await at(wait(1160));
      setAt(6);
      bubw.style.opacity = 0;
      envFlap.style.transform = 'scaleY(0)';
      envShut.style.opacity = 1; envShut.style.transform = 'scaleY(1)';
      envSeal.style.opacity = 1; envSeal.style.transform = 'none';
      envArt.style.opacity = 0; envArt.style.transform = 'translate(0px, 44px)';
      await at(STAGES[6](at));
      again.disabled = false;
      speed = 1; rounding = false; follow = null;
      if (!wide.matches) { await at(wait(6000)); if (!perfectDone) round(); }
    } catch (e) { if (e !== 0 && e.name !== 'AbortError') throw e; }
  };

  // "It's perfect": the seal presses onto the delivered envelope and the brand mark glints; nothing else moves.
  const flourish = () => {
    const seal = document.createElementNS(NS, 'g'), glint = document.createElementNS(NS, 'path');
    seal.innerHTML = `<circle class="fl-seal" cx="346" cy="${NY[6] + 19}" r="5.5"/><circle class="fl-seal-in" cx="346" cy="${NY[6] + 19}" r="3.2"/>`;
    seal.style.transformBox = 'fill-box'; seal.style.transformOrigin = '50% 50%';
    glint.setAttribute('d', 'M0-7l1.6 5.4 5.4 1.6-5.4 1.6-1.6 5.4-1.6-5.4-5.4-1.6 5.4-1.6z');
    glint.setAttribute('class', 'fl-glint');
    fly.append(seal, glint);
    const [gx, gy] = [520, NY[6] + 10]; // the tip of the mark's red slash
    A(seal, [{ transform: 'scale(1.9)', opacity: 0 }, { transform: 'scale(.82)', opacity: 1, offset: 0.55 }, { transform: 'scale(1)', opacity: 1 }], 420, { easing: 'ease-out', fill: 'forwards' });
    A(glint, [{ transform: `translate(${gx}px, ${gy}px) scale(0) rotate(0deg)` }, { transform: `translate(${gx}px, ${gy}px) scale(2.6) rotate(45deg)`, offset: 0.4 }, { transform: `translate(${gx}px, ${gy}px) scale(0) rotate(90deg)` }], 900, { delay: 360, easing: 'ease-out', fill: 'forwards' });
  };

  // Handwrites a crew's name on a slip, centred, from the Caveat letters in <defs> (#fl-hB ... with their advances).
  const GW = Object.fromEntries($$('#fl-hand path').map((p) => [p.id.slice(4), +p.dataset.w]));
  const write = (g, word) => {
    let x = -[...word].reduce((s, ch) => s + GW[ch], 0) / 2;
    g.replaceChildren(...[...word].map((ch) => {
      const u = document.createElementNS(NS, 'use');
      u.setAttribute('href', '#fl-h' + ch);
      u.setAttribute('x', x.toFixed(1));
      x += GW[ch];
      return u;
    }));
  };
  const setJob = (j) => {
    job = j; state = jobs[j].start; rounds = 1; lastKey = ''; roundEl.textContent = ''; perfectDone = false;
    tkTitle.textContent = jobs[j].title;
    crewText.forEach((t, i) => (t.textContent = jobs[j].crews[i]));
    rps.forEach((p, i) => write(p.querySelector('.fl-word'), jobs[j].crews[CREW[i]]));
    if (still) { draw(); return; }
    started = true;
    run(0, wide.matches ? Math.max(active, 0) : 6);
  };
  // The show starts by itself with a random job; the select stays on its placeholder until the visitor picks.
  const begin = () => { if (!picked) { picked = true; setJob(R(5)); } };

  const dots = caps.map((c, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', c.querySelector('strong').textContent);
    b.addEventListener('click', () => { picked = started = true; run(k, 6); });
    dotsBox.append(b);
    return b;
  });
  pick.hidden = false;
  select.addEventListener('change', () => { picked = true; setJob(select.selectedIndex - 1); });
  again.addEventListener('click', () => round(true));
  perfect.addEventListener('click', () => { perfectDone = true; cardSync(); if (!still) flourish(); });
  flow.classList.add('has-card');
  if (still) { ready = true; cardSync(); return; }
  flow.classList.add('is-live');
  dotsBox.hidden = false;
  caps[0].classList.add('on');
  dots[0].setAttribute('aria-current', 'step');
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; hold(); cardSync(); }).observe($('#flow'));
  document.addEventListener('visibilitychange', hold);
  new IntersectionObserver((es) => { if (es[0].isIntersecting) begin(); }, { rootMargin: '-50% 0px -50% 0px' }).observe($('.flow-box'));
  const capsIO = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) {
      active = caps.indexOf(e.target);
      if (wide.matches && started && !rounding) run(active, active); // a "Not quite right" round plays out
      else if (wide.matches) caps.forEach((c, i) => c.classList.toggle('on', i === active));
    }
  }, { rootMargin: '-50% 0px -50% 0px' });
  caps.forEach((c) => capsIO.observe(c));
})();
