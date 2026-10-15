/* Optional mailing-list opt-in. No storage or effects until an explicit submit. */
export const consentCopy = 'Yes, Meissner Services may email me occasional updates about what they build. I can unsubscribe with one click.';
export const successCopy = "You're on the list. One click unsubscribes.";
export const interestEndpoint = 'https://api.meissner.services/interest';
export const errorCopy = Object.freeze({
  consent_required: 'Tick the consent box if you want occasional updates.',
  bad_email: 'Enter a valid email address for the list.',
  captcha_failed: 'Spam verification failed. Try again.',
  configuration_unavailable: 'Signup is not available right now. Nothing was sent.',
  input_changed: 'Your choices changed. Check them and submit again.',
  transport: 'We could not confirm your signup. Your choices are still here; try again.'
});
function inputSnapshot(input) {
  if (input.consent !== true) throw new Error('consent_required');
  const email = String(input.email || '').trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('bad_email');
  // Placement attribution only. Private review/session identifiers are never copied.
  const source = /^(summary|page-[1-7])$/.test(input.source) ? input.source : undefined;
  return {email, consent: 'yes', ...(source ? {source} : {})};
}
export function interestTransport(fetcher = globalThis.fetch) {
  return async (payload, signal) => {
    const response = await fetcher(interestEndpoint, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload),
      credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'error', signal
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error(result.error || 'transport');
  };
}
export function interestController({readInput, verify, transport, onState = () => {}, timers = globalThis, timeoutMs = 60000}) {
  let pending = false;
  let state = {phase: 'idle', pending: false, message: '', error: ''};
  const emit = (phase, error = '') => {
    state = {phase, pending, error, message: phase === 'success' ? successCopy : errorCopy[error] ||
      (phase === 'verifying' ? 'Complete the spam verification below.' : phase === 'sending' ? 'Joining the list…' : '')};
    onState({...state});
  };
  return {
    state: () => ({...state}),
    async submit() {
      if (pending) return false;
      let snapshot;
      try { snapshot = inputSnapshot(readInput()); }
      catch (error) { emit('error', error.message); return false; }
      pending = true;
      const abort = new AbortController();
      const deadline = new Promise((_, reject) => abort.signal.addEventListener('abort', () => reject(new Error('transport')), {once: true}));
      const timer = timers.setTimeout(() => abort.abort(), timeoutMs);
      try {
        emit('verifying');
        const token = await Promise.race([verify(abort.signal), deadline]);
        if (!token || typeof token !== 'string') throw new Error('captcha_failed');
        if (JSON.stringify(inputSnapshot(readInput())) !== JSON.stringify(snapshot)) throw new Error('input_changed');
        emit('sending');
        await Promise.race([transport({...snapshot, 'cf-turnstile-response': token}, abort.signal), deadline]);
        pending = false; emit('success'); return true;
      } catch (error) {
        pending = false; emit('error', Object.hasOwn(errorCopy, error.message) ? error.message : 'transport'); return false;
      } finally {
        timers.clearTimeout(timer);
        // Also closes any outstanding verification widget after a deadline or failure.
        abort.abort();
      }
    }
  };
}
