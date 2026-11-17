// Meissner.Services demos page (t-623587f537): the walkthrough player and the case files' scenes.
// Without this script every word is on the page, every number is at its final value, every scene shows its last
// frame and the video keeps the browser's own controls. With it, each part with data-play plays once when it scrolls
// into view (one shared IntersectionObserver, one count-up helper); with reduced motion nothing moves.
(() => {
  const body = document.body;
  const hasIO = 'IntersectionObserver' in window;
  const motion = hasIO && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  body.classList.add('dm-js');
  if (motion) body.classList.add('dm-anim');

  /* ---------- scenes: one observer, one count-up ---------- */
  // A counter's final value is in the HTML; it is only animated up from data-from (default 0), data-at seconds after
  // its part starts, over data-dur milliseconds.
  const countUp = (el) => {
    const to = +el.dataset.count, from = +(el.dataset.from || 0), dur = +(el.dataset.dur || 1200);
    setTimeout(() => {
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        el.textContent = String(t < 1 ? Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))) : to);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, parseFloat(el.dataset.at || 0) * 1000);
  };
  if (motion) {
    document.querySelectorAll('[data-count]').forEach((el) => { el.textContent = el.dataset.from || '0'; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.classList.add('is-play');
        e.target.querySelectorAll('[data-count]').forEach(countUp);
      });
    }, { rootMargin: '0px 0px -22% 0px' });
    document.querySelectorAll('[data-play]').forEach((el) => io.observe(el));
  }

  /* ---------- the walkthrough player ---------- */
  const player = document.querySelector('.dm-player');
  const video = player && player.querySelector('video');
  if (!video) return;
  const source = video.querySelector('source');
  const big = player.querySelector('.dm-big'), bar = player.querySelector('.dm-bar');
  const pp = player.querySelector('.dm-pp'), cc = player.querySelector('.dm-cc'), mute = player.querySelector('.dm-mute');
  const cue = player.querySelector('.dm-cue'), cueText = cue.querySelector('span');
  const prog = player.querySelector('.dm-prog span');
  const beats = [...document.querySelectorAll('.dm-beats li')];
  const beatList = document.querySelector('.dm-beats');
  const track = video.textTracks && video.textTracks[0];

  // No video file (or one this browser cannot play): the slate keeps the heading and the transcript stays beside it.
  const missing = () => {
    player.classList.add('is-missing');
    big.hidden = true; bar.hidden = true; cue.hidden = true;
    video.removeAttribute('controls');
  };
  if (video.error) return missing();
  source && source.addEventListener('error', missing);
  video.addEventListener('error', missing);
  // The source may have failed before this script ran: no source left, nothing loaded, a moment later still nothing.
  const noSource = () => video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE && video.readyState === 0;
  if (noSource()) setTimeout(() => { if (noSource()) missing(); }, 400);

  video.removeAttribute('controls');
  big.hidden = false; bar.hidden = false;
  player.classList.add('is-custom');

  let showCaps = true;
  const paintCue = () => {
    // Before the first play the big play button owns the picture: a cue that starts at 0:00 waits for it.
    if (!player.classList.contains('is-started')) return;
    const active = track && track.activeCues && track.activeCues[0];
    const text = active ? active.text : '';
    cueText.textContent = text;
    cue.hidden = !(showCaps && text);
    if (active && track.cues) {
      const i = [...track.cues].indexOf(active);
      beats.forEach((li, k) => li.classList.toggle('is-now', k === i));
      const li = beats[i];
      if (li && beatList.scrollHeight > beatList.clientHeight + 4) {
        beatList.scrollTo({ top: li.offsetTop - 12, behavior: motion ? 'smooth' : 'auto' });
      }
    }
  };
  if (track) {
    // The track loads and fires cue changes; the page draws the caption itself, in the site's speech bubble.
    track.mode = 'hidden';
    track.addEventListener('cuechange', paintCue);
  }

  const setPlaying = () => {
    const on = !video.paused && !video.ended;
    player.classList.toggle('is-playing', on);
    pp.setAttribute('aria-label', on ? pp.dataset.pauseLabel : pp.dataset.playLabel);
    if (on && !player.classList.contains('is-started')) { player.classList.add('is-started'); paintCue(); }
  };
  const toggle = () => { if (video.paused || video.ended) video.play().catch(() => {}); else video.pause(); };
  big.addEventListener('click', () => { video.play().catch(() => {}); pp.focus({ preventScroll: true }); });
  pp.addEventListener('click', toggle);
  video.addEventListener('click', toggle);
  video.addEventListener('play', setPlaying);
  video.addEventListener('pause', setPlaying);
  video.addEventListener('ended', setPlaying);

  cc.addEventListener('click', () => {
    showCaps = !showCaps;
    cc.setAttribute('aria-pressed', String(showCaps));
    paintCue();
  });
  mute.addEventListener('click', () => {
    video.muted = !video.muted;
    mute.setAttribute('aria-pressed', String(video.muted));
  });

  let raf = 0;
  const paintProg = () => {
    const d = video.duration;
    prog.style.transform = `scaleX(${d > 0 ? Math.min(1, video.currentTime / d) : 0})`;
    if (!video.paused && !video.ended) raf = requestAnimationFrame(paintProg);
  };
  video.addEventListener('timeupdate', () => { cancelAnimationFrame(raf); paintProg(); });
  video.addEventListener('seeked', paintProg);
})();
