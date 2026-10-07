/* Design 5 features: pick-a-price scope explorer and scope-change comparison.
   Data comes from the page's own approved pricing table (5.PRICING); nothing here invents a price,
   a quote or a turnaround. Runs entirely in the browser, no network, no storage. */
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  /* ---------- 1. Read the approved table as data ---------- */
  function readTiers() {
    const rows = $$('#\\35 \\.PRICING table.ledger tbody tr');
    return rows.map((tr) => {
      const cells = $$('td', tr);
      const price = Number((cells[0]?.textContent || '').replace(/[^0-9]/g, ''));
      return {
        price,
        buys: (cells[1]?.textContent || '').trim(),
        included: $$('li', cells[2] || tr).map((li) => li.textContent.trim()),
      };
    }).filter((t) => t.price > 0);
  }
  /* Pick-a-price points are the three approved examples (100, 300, 500). Any other table row, such as the
     quoted 250 first-phase example, stays in the table as provenance and is not offered as a choice here. */
  const PICK_PRICES = [100, 300, 500];
  function approvedTiers() { return readTiers().filter((t) => PICK_PRICES.includes(t.price)); }

  const ALWAYS_EXCLUDED = [
    'Tax or legal advice',
    'Filing with your credentials on your behalf',
    'Claims about trading or investment performance',
    'Access to your accounts beyond the engagement',
  ];
  const MOVES_PRICE = [
    'More rows, files or input formats than agreed',
    'A required output format we have not worked in before (adds a discovery step)',
    'Legal signatures or filings that need your certificate provider',
    'Live third-party credentials, used only inside your accounts',
  ];

  /* ---------- 2. Scope-change rules ---------- */
  const CHANGES = [
    {id: 'rows', label: 'More rows, files or records than agreed', kind: 'requote', why: 'Volume was fixed at the yes; the extra is sized and gets its own yes before we do it.'},
    {id: 'format-in', label: 'A second input format (another sheet, export or system)', kind: 'requote', why: 'Each input format is its own parsing and validation step.'},
    {id: 'format-out', label: 'An output format we have not worked in before', kind: 'review', why: 'We check the format first; a discovery step may be needed and is said before, not after.'},
    {id: 'signature', label: 'Legally valid digital signatures or official filings', kind: 'review', why: 'Needs your certificate provider or authority account; we never file with your credentials.'},
    {id: 'live-keys', label: 'Live third-party API credentials', kind: 'review', why: 'Used only inside your accounts, agreed in writing, revoked at hand-back.'},
    {id: 'correction', label: 'A second correction round', kind: 'included-note', why: 'One round is included; a second is agreed as a small fixed item before it starts.'},
    {id: 'questions', label: 'More than one round of questions', kind: 'included', why: 'Questions during the work are answered as they come, inside the same scope.'},
    {id: 'hourly', label: 'You would rather be billed hourly', kind: 'review', why: 'Prices are fixed at the yes; agent time is not tracked time. We can split the job into fixed milestones instead.'},
    {id: 'files-only', label: 'Hand-back as files only, nothing kept on our side', kind: 'included', why: 'Everything is built in your accounts wherever the tool allows; anything else comes back as files in the agreed format. We host nothing for you after hand-back.'},
    {id: 'language', label: 'Deliverables and documentation in Spanish', kind: 'included', why: 'English and Spanish are inside the scope. Portuguese is conversational and is reviewed before publishing.'},
    {id: 'earlier', label: 'A start before the inputs are agreed', kind: 'review', why: 'The clock starts at the agreed inputs; starting earlier means re-doing work when inputs change, so we say so first.'},
    {id: 'advice', label: 'Tax or legal advice as part of the job', kind: 'not-offered', why: 'We build and document the tools; the decisions stay with you.'},
  ];
  const KIND = {
    'included': {label: 'Included', cls: 'ok'},
    'included-note': {label: 'Included once; more is agreed first', cls: 'ok'},
    'review': {label: 'Needs a review before we start', cls: 'review'},
    'requote': {label: 'Changes the scope: agreed in writing before any work', cls: 'requote'},
    'not-offered': {label: 'Not offered', cls: 'no'},
  };

  /* ---------- 3. Pick-a-price explorer ---------- */
  function renderPick(root, tiers, selected) {
    const tier = tiers.find((t) => t.price === selected) || tiers[0];
    const allIncluded = new Set(tiers.flatMap((t) => t.included));
    const notHere = Array.from(allIncluded).filter((i) => !tier.included.includes(i));
    const out = $('[data-pick-output]', root);
    out.innerHTML = `
      <h3 data-component="5.PICK.headline-${tier.price}" data-type="headline">USD ${tier.price}, fixed, agreed before work starts</h3>
      <p data-component="5.PICK.buys-${tier.price}" data-type="item">${esc(tier.buys)}</p>
      <div class="pick-cols">
        <div data-component="5.PICK.included-${tier.price}" data-type="card">
          <b>Included at this price</b>
          <ul>${tier.included.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        </div>
        <div data-component="5.PICK.excluded-${tier.price}" data-type="card">
          <b>Not in this scope</b>
          <ul>${notHere.map((i) => `<li>${esc(i)} <span class="pick-dim">(part of a different example)</span></li>`).join('')}${MOVES_PRICE.map((i) => `<li>${esc(i)} <span class="pick-dim">(moves the price up)</span></li>`).join('')}</ul>
        </div>
        <div data-component="5.PICK.never-${tier.price}" data-type="card">
          <b>Never, at any price</b>
          <ul>${ALWAYS_EXCLUDED.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        </div>
      </div>`;
    $$('[data-pick-price]', root).forEach((b) => {
      const on = Number(b.dataset.pickPrice) === tier.price;
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function initPick() {
    const root = $('#\\35 \\.PICK');
    if (!root) return;
    const tiers = approvedTiers();
    if (!tiers.length) return;
    const bar = $('[data-pick-bar]', root);
    bar.innerHTML = tiers.map((t) => `<button type="button" class="pick-btn" data-pick-price="${t.price}" aria-pressed="false" data-component="5.PICK.price-${t.price}" data-type="cta">USD ${t.price}</button>`).join('');
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick-price]');
      if (!b) return;
      renderPick(root, tiers, Number(b.dataset.pickPrice));
    });
    bar.addEventListener('keydown', (e) => {
      const btns = $$('[data-pick-price]', bar); const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length].focus(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
    });
    renderPick(root, tiers, tiers[Math.min(1, tiers.length - 1)].price);
  }

  /* ---------- 4. Scope-change comparison ---------- */
  function renderChange(root, tiers) {
    const base = tiers.find((t) => t.price === Number($('[data-change-base]', root).value)) || tiers[0];
    const picked = $$('[data-change-id]:checked', root).map((c) => CHANGES.find((x) => x.id === c.dataset.changeId)).filter(Boolean);
    const out = $('[data-change-output]', root);
    const groups = {included: [], review: [], requote: [], no: []};
    picked.forEach((c) => {
      const g = c.kind === 'not-offered' ? 'no' : c.kind === 'requote' ? 'requote' : c.kind === 'review' ? 'review' : 'included';
      groups[g].push(c);
    });
    const row = (c) => `<li data-component="5.CHANGE.result-${c.id}" data-type="item"><b>${esc(c.label)}</b> <span class="chg chg-${KIND[c.kind].cls}">${esc(KIND[c.kind].label)}</span><br><span class="pick-dim">${esc(c.why)}</span></li>`;
    /* Headline precedence: a not-offered item or a separately quoted item is named first, and
       "All of these fit" appears only when every ticked item is plainly included. */
    const kinds = new Set(picked.map((c) => c.kind));
    const hard = kinds.has('not-offered'), requote = kinds.has('requote'), review = kinds.has('review'),
      quoted = kinds.has('included-note'), included = kinds.has('included');
    const parts = [];
    if (!picked.length) parts.push('Tick the changes you have in mind.');
    if (hard) parts.push(picked.every((c) => c.kind === 'not-offered') ? 'We do not offer this, at any price.' : 'Some of these we do not offer, at any price.');
    if (requote) parts.push('Scope changes: the new scope gets its own written yes before any work, and you decide.');
    else if (review) parts.push('No scope change yet, but some items need a review before we start.');
    if (quoted) parts.push('A second correction round is agreed as a small fixed item before it starts.');
    if (included && !requote && !review) parts.push(hard || quoted ? 'The rest fits inside the agreed scope.' : 'All of these fit inside the agreed scope.');
    const verdict = parts.join(' ');
    out.innerHTML = `
      <p class="chg-verdict" data-component="5.CHANGE.verdict" data-type="headline">${esc(verdict)}</p>
      <div class="pick-cols">
        <div data-component="5.CHANGE.base" data-type="card"><b>Agreed scope, USD ${base.price}</b><ul>${base.included.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>
        <div data-component="5.CHANGE.changes" data-type="card"><b>With your changes</b>
          ${picked.length ? `<ul>${[...groups.included, ...groups.review, ...groups.requote, ...groups.no].map(row).join('')}</ul>` : '<p class="pick-dim">No changes ticked.</p>'}
        </div>
      </div>
      <p class="note" data-component="5.CHANGE.status" data-type="proof">No price or delivery time is shown here on purpose: a changed scope is agreed in writing before work starts, and we do not print a turnaround until we have measured one. This comparison is a draft a human reviews with you.</p>`;
  }

  function initChange() {
    const root = $('#\\35 \\.CHANGE');
    if (!root) return;
    const tiers = approvedTiers();
    if (!tiers.length) return;
    const sel = $('[data-change-base]', root);
    sel.innerHTML = tiers.map((t) => `<option value="${t.price}">USD ${t.price}: ${esc(t.buys.slice(0, 60))}…</option>`).join('');
    sel.value = String(tiers[Math.min(1, tiers.length - 1)].price);
    const list = $('[data-change-list]', root);
    list.innerHTML = CHANGES.map((c) => `<label class="chg-opt" data-component="5.CHANGE.option-${c.id}" data-type="item"><input type="checkbox" data-change-id="${c.id}"> <span>${esc(c.label)}</span></label>`).join('');
    root.addEventListener('change', () => renderChange(root, tiers));
    renderChange(root, tiers);
  }

  const start = () => { try { initPick(); initChange(); } catch (e) { /* features are additive; the page stands without them */ } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
