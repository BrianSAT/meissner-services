// /7 features (Face): WhatsApp brief composer and voice brief recorder.
// Nothing is sent automatically. WhatsApp opens only when the viewer taps, and WhatsApp itself needs their tap to send.
// The voice note stays on the viewer's device unless they save and share it themselves.
const $ = (s, r = document) => r.querySelector(s);
const WA = '12623661718';

function initComposer() {
  const root = $('[data-feature="wabrief"]'); if (!root) return;
  const need = $('#wa-need', root), tools = $('#wa-tools', root), timing = $('#wa-timing', root), band = $('#wa-band', root);
  const prev = $('#wa-preview', root), open = $('.wa-open', root), mail = $('.wa-mail', root), copy = $('.wa-copy', root);
  let edited = false;
  const compose = () => {
    const lines = ['Hi Meissner Services, I have a project.'];
    if (need.value.trim()) lines.push(`What I need: ${need.value.trim()}`);
    if (tools.value.trim()) lines.push(`Tools I use: ${tools.value.trim()}`);
    if (timing.value) lines.push(`Timing: ${timing.value}`);
    if (band.value) lines.push(`Budget: ${band.value}`);
    return lines.join('\n');
  };
  const sync = () => { if (!edited) prev.value = compose(); links(); };
  const links = () => {
    const t = prev.value.trim();
    open.href = `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
    mail.href = `mailto:team@meissner.services?subject=${encodeURIComponent('Project brief')}&body=${encodeURIComponent(t)}`;
  };
  [need, tools, timing, band].forEach(el => el.addEventListener('input', sync));
  prev.addEventListener('input', () => { edited = true; links(); });
  $('.wa-reset', root).addEventListener('click', () => { edited = false; sync(); });
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(prev.value); copy.textContent = 'Copied'; } catch { copy.textContent = 'Copy failed'; }
    setTimeout(() => { copy.textContent = 'Copy message'; }, 2000);
  });
  sync();
}

function initVoice() {
  const root = $('[data-feature="voice"]'); if (!root) return;
  const rec = $('.v-rec', root), stop = $('.v-stop', root), status = $('.v-status', root), player = $('audio', root);
  const del = $('.v-del', root), save = $('.v-save', root), after = $('.v-after', root);
  if (!(navigator.mediaDevices && window.MediaRecorder)) {
    rec.disabled = true; status.textContent = 'This browser cannot record audio here. Use the WhatsApp brief above, or record a voice note in WhatsApp itself.'; return;
  }
  let mr, chunks = [], timer, started, url, stream;
  const LIMIT = 60;
  const reset = () => {
    if (url) URL.revokeObjectURL(url); url = null; player.removeAttribute('src'); player.load();
    after.hidden = true; rec.disabled = false; status.textContent = 'Nothing recorded.';
  };
  rec.addEventListener('click', async () => {
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { status.textContent = 'Microphone permission was not given, so nothing was recorded.'; return; }
    chunks = []; mr = new MediaRecorder(stream);
    mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop()); clearInterval(timer);
      const type = mr.mimeType || 'audio/webm'; const blob = new Blob(chunks, { type });
      url = URL.createObjectURL(blob); player.src = url; after.hidden = false;
      const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
      save.onclick = () => { const a = Object.assign(document.createElement('a'), { href: url, download: `voice-brief.${ext}` }); document.body.append(a); a.click(); a.remove(); };
      status.textContent = `Recorded ${Math.round((Date.now() - started) / 1000)} s. Listen back, then save it or delete it.`;
      rec.disabled = false; stop.disabled = true;
    };
    mr.start(); started = Date.now(); rec.disabled = true; stop.disabled = false; after.hidden = true;
    timer = setInterval(() => {
      const s = Math.round((Date.now() - started) / 1000);
      status.textContent = `Recording… ${s} s of ${LIMIT} s`;
      if (s >= LIMIT) mr.stop();
    }, 250);
  });
  stop.addEventListener('click', () => { if (mr && mr.state === 'recording') mr.stop(); });
  del.addEventListener('click', reset);
  reset();
}
initComposer(); initVoice();
