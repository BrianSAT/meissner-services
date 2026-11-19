// Ann's welcome page (t-mail-followup-2909c441e4). The player itself is ../demos/demos.js. This file ties the written
// steps to the video: the step being spoken lights up, and "Show me" jumps the video to that step. Cue ids in
// walkthrough.vtt are the beat ids named in each step's data-beats. Without this script the steps are plain text.
(() => {
  const player = document.querySelector('.dm-player');
  const video = player && player.querySelector('video');
  const trackEl = video && video.querySelector('track');
  const track = video && video.textTracks && video.textTracks[0];
  const steps = [...document.querySelectorAll('[data-beats]')];
  if (!track || !steps.length) return;
  const ids = (el) => el.dataset.beats.split(' ');

  track.addEventListener('cuechange', () => {
    const cue = track.activeCues && track.activeCues[0];
    if (cue) steps.forEach((el) => el.classList.toggle('is-now', ids(el).includes(cue.id)));
  });

  // "Show me" appears only once the cue times are known and the video can play.
  const offer = () => {
    if (!track.cues || !track.cues.length || player.classList.contains('is-missing')) return;
    document.body.classList.add('aw-seekable');
    steps.forEach((el) => {
      const btn = el.querySelector('.aw-seek');
      const cue = track.cues.getCueById(ids(el)[0]);
      if (!btn || !cue) return;
      btn.hidden = false;
      btn.addEventListener('click', () => {
        video.currentTime = cue.startTime + 0.05;
        video.play().catch(() => {});
        if (player.getBoundingClientRect().top < 0) player.scrollIntoView({ block: 'start', behavior: 'auto' });
      });
    });
  };
  if (trackEl.readyState === 2) offer(); else trackEl.addEventListener('load', offer, { once: true });
})();
