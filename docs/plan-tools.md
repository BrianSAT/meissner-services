# Design 1 and 6 viewer tools

Task t-3d8dfabd99, corrected successor to t-b617b4a072. Source-only delivery;
production/device/Lighthouse acceptance remains open. Base includes B.A.'s earlier
modal/audio commits5644ca3 and2af45df; guarded integration and independent review
remain required before yard installation. Preserve later /3 and other seat changes.

Four rateable sections:1.SCOPER,1.CHECKLIST,6.BRIEF,6.READINESS, plus headlines in
component catalog. Forms carry data-echo-interactive. Transitive public modules
are explicitly included in the v5 offline shell. No login, tracker, crew bearer,
subscription or paid service added. Scoper use still requires existing external
authority. Other tools use no endpoint.

A mid-tier engineer can explain these files within twenty minutes:

- 1/scope.mjs checks the supplied Cuz POST /scope contract, validates draft=true,
  three options/two–four needs/known band, rejects unapproved price/timing prose,
  replaces secret/credential needs with access-you-grant wording and renders with
  textContent. Transport omits cookies/referrer, rejects redirects, and never
  fabricates success for400/503/bad JSON/bad schema/offline failures. The separate
  checklist maps only entered outcome/format/example/rules to editable checks.
- 1/tools.mjs loads the existing public facts/Turnstile sitekey only on explicit
  protection click. Expired/error captcha disables submit. One request at a time,
  input locked while pending,30s timeout, stale output cleared, consumed captcha
  reset after success/error. Disclosure says descriptions go to Meissner Services
  and are stored as enquiries; no invented retention, reply-time or deletion claim.
  Checklist is local, edited current text is downloaded, no storage/send claim.
- 6/brief.mjs supplies curated EN/ES headings; entered prose is kept verbatim,
  missing language marked, no professional/AI translation implied. Six readiness
  questions produce concrete missing-input next steps, no quote/date/approval.
- 6/tools.mjs mounts labeled paired fields, editable plaintext export and local
  readiness checkboxes. EN/ES page changes re-label readiness without losing
  the brief. No endpoint, mail or persistent storage. Download to keep the work.
- Local CSS inherits page themes, labels/focus,44px controls, narrow one-column
  forms and reduced motion. No new image/font or animation dependency.

Contract: FULL raw mail179096130361.2832171.1316096373733725967@satrails.com,
t-mail-9750d86d20. Request text10–600/lang=en/variant=1/cf-turnstile-response.
Price authority: Amy t-f5c2621490,scoper-price-bands-20261002.json. Four English
IDs/labels copied exactly; no server/model label used. ES approved labels not
needed for English /1 scoper. PT draft labels are not shipped. New bilingual
heading/copy drafts still need assigned independent language review.

Offline Node tests exercise production functions and controller modules against
fake DOM/FormData/Turnstile/HTTP/URL/blob/timers. Tests cover schema/errors,
repeat submit, timeout/captcha reset, safe HTML-like text, editable downloads,
missing-language fields, readiness and catalog/shell integration. These are not
browser/device, real Turnstile or Worker receipts. No bearer, live client data or
Cuz's deleted smoke session is used.

Release review: independent source/copy/privacy review, guarded integration,
then authorized yard installation/hash and fresh approved public /scope
validation/error/retry receipts. Mobile/desktop keyboard, larger text,
light/dark, EN/ES switch, editing/export and offline local tools need actual
checks. Record measured Lighthouse>=90 against that exact deployed revision.
None is fabricated here; missing production evidence keeps task at REVIEW.

## Current integration (2026-10-15)

Reintegrated onto current main ff59bdb in isolated branch ba/plan-tools-integration-20261015. Current /1 and /6 page copy is preserved byte-for-byte after removing the four added sections and two head inclusions. All six reviewed tool modules remain byte-identical to 26a6d25; Frankie Spanish review t-01d97888f7 is COMPLETE. Current service-worker modules are retained and the six tool resources added, with a fresh cache name. Node tests: 55/55 including 14 planning-tool checks. The actual public route is POST https://api.meissner.services/scope: empty body returns400 text_10_to_600_chars, not /api/scope (404). No bearer or client content used. Valid CAPTCHA/generated-draft, device/Lighthouse and publication receipts remain open. The normal site pages branch replaces the historical yard-install route; do not push all main. Independent cumulative review precedes publishing and Face live verification.
