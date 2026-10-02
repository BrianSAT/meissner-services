# Echo Review interface contract

B.A. owns assets/echo-* and /review hub, /review/summary and /review/iterate.
Face owns numbered-page tagging, copy, /how-we-work and review/components.json.
Load one module script: `<script type="module" src="/assets/echo-review.js"></script>`.
The kit loads its CSS itself. Ordinary pages retain their behavior when review is off.

Tag any nested element with stable `data-component="4.HERO.headline"` and
`data-type="headline"`. Existing spellings are supported. Optional `data-label`
is a human-readable name; an `id` matching data-component gives a native fragment
anchor (the kit also resolves data-component when no matching id exists). IDs are
unique in one document. Nesting defines the component breadcrumb; click selects the
innermost tag. Never put an iteration prefix into logical data-component IDs.

Section types: hero, process, pricing, contact, logo, story, faq, method, canonical.
Child types include headline, subhead, eyebrow, cta, step, pricing-card, paragraph.
The summary keeps style/copy scores independent and groups like types. Rendering
extracts semantic headings, paragraphs/lists and CTA text/link; optional
`data-copy-role="title|body|cta"` marks exact content. Copy is structured data,
presentation comes from scoped data-style renderers. Do not supply scripts/HTML
in ratings or notes. review/components.json enumerates all seven candidates.

The backend rating key is `i<iteration>:<logical-id>`, e.g. i2:slot-hero.
The payload's iteration is also2; a later round cannot overwrite i1:4.HERO.
Scores1–5 are echoes;0 is explicitly N/A;null remains unrated. A partial score
persists without inventing the other measure. Next-unrated means at least one
measure is null; N/A is answered and excluded from averages.

A session capability remains in private URL/localStorage and the Worker. No ingest
bearer or private session data belongs in public assets, static HTML or the repo.
Internal links carry?s=; deep links additionally#component. Review-off preserves
normal navigation. /review is the start/resume hub. Summary links preserve the
session and open the selected component after scrolling/highlighting.

Iteration layouts store order, hidden IDs and per-slot copy/style choices. The
instant deterministic draft is distinct from a crew-refined result. Crew results
are structured private backend data rendered by a generic public route; do not
publish viewer notes/content as static GitHub Pages files. The API request lifecycle
is open -> durable native crew task -> working -> real revised result -> ready.
Client layout edits survive installing refined content. No delivery time is claimed.

Review endpoints are https://api.meissner.services/review; production tests use
clearly labelled synthetic review sessions and never repost contact submissions.
Revenue SEND replies and real leads preempt site work within one intake cycle.

## Superseding rule — Brian t-mail-618f8202ba

The necessary denominator is always seven PAGES: one1–5 score on either style
or copy of any component completes a page; N/A does not. Iteration1 layout stores
review_plan version2, required_pages1–7 and denominator7. There is no20–28-item
core requirement. Next rating goes to the next page with no qualifying score.
Missing direct measures inherit a weak same-page average, explicitly labelled as
a guess; direct scores and explicit N/A override that proxy. Direct evidence
 outranks inherited candidates. Extra ratings never increase Y; +3 is optional.

Rater isolation: links carry?s=...&r=...; backend ratings have separate rater keys,
verified with owner and an invited test rater writing the SAME iteration/cid without
overwrite. Local pending storage is partitioned by sid AND rater. elapsed_ms is
a monotonic modal-open-to-save duration and is confirmed persisted by the backend.
Total active time must exclude background/idle and union overlapping recorder spans.
The exact backend time route/field is awaiting Cuz; no unsupported persistence is
claimed. No QR or link payload is sent to a third-party QR service.

Three modes share the same `iN:logical-id` rating per rater. `mode` is `tour`,
`compare` or `rank`; latest direct values replace earlier ones. Rank preserves the
other measure, stores raw order and skips in layout-1 `rankings`, and uses exact
finite scores `5 - 4 * position / (includedCount - 1)`. A singleton is 5; an
empty included list writes only N/A for skipped candidates. Backend fractional
scores currently return HTTP400 and are an explicit deployment dependency.
Style and copy inheritance use separate same-page DIRECT-measure averages.
No evidence for a measure means unknown; inferred scores never feed averages.

`tools/echo-refine.py` is the private request bridge. Its `intake` command writes
mode-0600 job packets under the ONE state root, files stable assigned Face tasks,
and only then marks requests working. `complete --request-id … --result-file …`
requires actual structured copy for every chosen slot, reads the current layout,
preserves viewer edits, publishes copy to the private Worker, then marks ready.
It never sends messages or manufactures a ready result. The public repo stores
no session capabilities or administrator bearer. Operational polling is a yard
installation handoff; tests use injected API/ledger fixtures.

QR code generation runs locally from the MIT qrcode-generator module pinned to
83b7e8fe3fddd3b0368dbafd6ce56995bd25e3c8; license in ECHO-QR-LICENSE.txt.
A mid-tier engineer can trace this kit in twenty minutes: pure preferences and
layout in echo-core.mjs, DOM/network UI in echo-review.js, scoped presentation in
CSS, and the private native-task/refinement bridge in tools/echo-refine.py.

Production follow-up receipts: compact source layouts fixed Worker size rejection;
real rating/save/reload/deep-link/next,11-slot draft and request, persisted hide,
Compare7, singleton/all-skipped Rank, private QR, actual Face-refined ready link,
and concurrent copy/style swap reload tested on390px. Refinement preserves
viewer choices made while crew works; if a copy source changed, that slot uses
its selected source and labels the older crew-copy source. Canonical copy stays
verbatim. Unsaved modal/rank choices stay on the same device until Save; API
pending ratings remain visibly pending rather than claiming remote durability.
Active-time clock logic excludes idle/background and passes its unit check;
remote total active time remains unimplemented until Cuz supplies the exact
persistence contract. Rating elapsed_ms and multi-rater isolation are live/proven.
