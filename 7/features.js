// /7 features (Face): WhatsApp brief composer and voice brief recorder.
// Nothing is sent automatically. WhatsApp opens only when the viewer taps, and WhatsApp itself needs their tap to send.
// The voice note stays on the viewer's device until they tick consent, add a contact and press Send (POST /voice, Cuz contract t-mail-9750d86d20).
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

const VOICE_ENDPOINT = 'https://api.meissner.services/voice';
const TURNSTILE_SITEKEY = '0x4AAAAAAFLx3ja-z07QWqEj';
const OK_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/mpeg', 'audio/wav'];
const ERRORS = {
  consent_required: 'Please tick the consent box first.',
  need_email_or_whatsapp: 'Add an email or a WhatsApp number so we can reply.',
  bad_email: 'That email address doesn\u2019t look right.',
  audio_required: 'There is no recording to send. Record one first.',
  unsupported_audio_type: 'This browser recorded a format we can\u2019t accept. Save it and send it on WhatsApp instead.',
  audio_1kb_to_2mb: 'The recording is too short or too large to send. Record again, under 90 seconds.',
  duration_max_90s: 'The recording is over 90 seconds. Record a shorter one.',
  captcha_failed: 'The spam check failed. Tick it again, then send.'
};
let turnstileP;
function turnstileApi() {
  if (!turnstileP) turnstileP = new Promise((resolve, reject) => {
    if (window.turnstile) { resolve(window.turnstile); return; }
    const sc = Object.assign(document.createElement('script'), { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', async: true });
    sc.onload = () => resolve(window.turnstile); sc.onerror = reject; document.head.append(sc);
  });
  return turnstileP;
}

function initVoice() {
  const root = $('[data-feature="voice"]'); if (!root) return;
  const consent = $('#v-consent', root), rec = $('.v-rec', root), stop = $('.v-stop', root), status = $('.v-status', root);
  const player = $('audio', root), after = $('.v-after', root), del = $('.v-del', root), save = $('.v-save', root);
  const form = $('.v-form', root), send = $('.v-send', root), sendStatus = $('.v-send-status', root), widget = $('.v-turnstile', root);
  if (!(navigator.mediaDevices && window.MediaRecorder)) {
    rec.disabled = true; consent.disabled = true;
    status.textContent = 'This browser cannot record audio here. Use the WhatsApp brief above, or record a voice note in WhatsApp itself.'; return;
  }
  const LIMIT = 90, MAX_BYTES = 2 * 1024 * 1024;
  let mr, chunks = [], timer, started, url, stream, blob, seconds = 0, token = '', widgetId = null, sending = false;
  const baseType = t => (t || '').split(';')[0].trim().toLowerCase();
  const canSend = () => { send.disabled = sending || !blob || !token; };
  const reset = () => {
    if (url) URL.revokeObjectURL(url); url = null; blob = null; seconds = 0;
    player.removeAttribute('src'); player.load(); after.hidden = true;
    rec.disabled = !consent.checked; status.textContent = 'Nothing recorded.'; sendStatus.textContent = ''; canSend();
  };
  consent.addEventListener('change', () => { if (!mr || mr.state !== 'recording') rec.disabled = !consent.checked; });
  rec.addEventListener('click', async () => {
    if (!consent.checked) return;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { status.textContent = 'Microphone permission was not given, so nothing was recorded.'; return; }
    chunks = [];
    const pref = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported?.(t));
    mr = new MediaRecorder(stream, Object.assign({ audioBitsPerSecond: 32000 }, pref ? { mimeType: pref } : {}));
    mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop()); clearInterval(timer);
      seconds = Math.min(LIMIT, Math.max(1, Math.round((Date.now() - started) / 1000)));
      const type = mr.mimeType || 'audio/webm'; blob = new Blob(chunks, { type });
      url = URL.createObjectURL(blob); player.src = url; after.hidden = false;
      const ext = baseType(type).includes('mp4') ? 'm4a' : baseType(type).includes('ogg') ? 'ogg' : 'webm';
      save.onclick = () => { const a = Object.assign(document.createElement('a'), { href: url, download: `voice-brief.${ext}` }); document.body.append(a); a.click(); a.remove(); };
      const okType = OK_TYPES.includes(baseType(type)), okSize = blob.size >= 1024 && blob.size <= MAX_BYTES;
      status.textContent = `Recorded ${seconds} s. Listen back, then send it, save it or delete it.`;
      form.hidden = !(okType && okSize);
      if (!okType) sendStatus.textContent = ERRORS.unsupported_audio_type;
      else if (!okSize) sendStatus.textContent = ERRORS.audio_1kb_to_2mb;
      rec.disabled = !consent.checked; stop.disabled = true;
      if (okType && okSize) startTurnstile();
      canSend();
    };
    mr.start(); started = Date.now(); rec.disabled = true; stop.disabled = false; after.hidden = true; sendStatus.textContent = '';
    timer = setInterval(() => {
      const s = Math.round((Date.now() - started) / 1000);
      status.textContent = `Recording… ${s} s of ${LIMIT} s`;
      if (s >= LIMIT && mr.state === 'recording') mr.stop();
    }, 250);
  });
  stop.addEventListener('click', () => { if (mr && mr.state === 'recording') mr.stop(); });
  function startTurnstile() {
    if (widgetId !== null) return;
    widgetId = 'pending'; sendStatus.textContent = 'Loading the spam check…';
    turnstileApi().then(api => {
      const local = ['localhost', '127.0.0.1'].includes(location.hostname);
      widgetId = api.render(widget, { sitekey: local ? '1x00000000000000000000AA' : TURNSTILE_SITEKEY, theme: 'auto',
        size: widget.clientWidth < 300 ? 'compact' : 'normal',
        callback: t => { token = t; sendStatus.textContent = ''; canSend(); },
        'expired-callback': () => { token = ''; canSend(); },
        'error-callback': () => { token = ''; canSend(); sendStatus.textContent = 'The spam check could not load. Save the recording and send it on WhatsApp instead.'; } });
    }).catch(() => { widgetId = null; sendStatus.textContent = 'The spam check could not load. Save the recording and send it on WhatsApp instead.'; });
  }
  send.addEventListener('click', async () => {
    if (sending || !blob) return;
    const email = $('#v-email', root).value.trim(), wa = $('#v-wa', root).value.trim();
    if (!email && !wa) { sendStatus.textContent = ERRORS.need_email_or_whatsapp; return; }
    sending = true; canSend(); sendStatus.textContent = 'Sending…';
    const fd = new FormData();
    const type = baseType(blob.type) || 'audio/webm';
    const ext = type.includes('mp4') || type.includes('m4a') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
    fd.append('audio', new File([blob], `voice-brief.${ext}`, { type: blob.type || type }));
    fd.append('consent', 'yes');
    if (email) fd.append('email', email);
    if (wa) fd.append('whatsapp', wa);
    const name = $('#v-name', root).value.trim(), msg = $('#v-msg', root).value.trim();
    if (name) fd.append('name', name);
    if (msg) fd.append('message', msg);
    fd.append('duration_s', String(seconds)); fd.append('variant', '7'); fd.append('lang', 'en');
    fd.append('cf-turnstile-response', token);
    try {
      const r = await fetch(VOICE_ENDPOINT, { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        sendStatus.textContent = `Received. Your reference is ${j.id}. Brian will reply by ${email ? 'email' : 'WhatsApp'}.`;
        form.hidden = true; send.disabled = true; del.textContent = 'Clear this page'; return;
      }
      sendStatus.textContent = ERRORS[j.error] || 'It didn\u2019t send. Your recording is still here: try again, or save it and send it on WhatsApp.';
    } catch {
      sendStatus.textContent = 'It didn\u2019t send (no connection). Your recording is still here: try again, or save it and send it on WhatsApp.';
    }
    sending = false; token = '';
    try { if (window.turnstile && widgetId && widgetId !== 'pending') window.turnstile.reset(widgetId); } catch {}
    canSend();
  });
  del.addEventListener('click', () => { reset(); form.hidden = true; del.textContent = 'Delete'; });
  reset();
}
initComposer(); initVoice();
