# Meissner Services: seven marketing concepts

Live owner review: https://meissner.services/review/ . Every page is noindex and
has no trackers. Phase 1 contact is mailto + Brian's supplied WhatsApp number;
no form, backend or WhatsApp-to-email integration is claimed.

Shared checkout: `/home/brian/.local/share/gigchase/sites/meissner-services`.
Page leads own their numbered directories: Hannibal1/6/review; Face2/7;
Murdock3; B.A.4/assets/root/hosting; Amy5. Commit explicit leaf paths.

Include `/assets/shared.css`, then your page stylesheet, and defer
`/assets/shared.js`. Place `<meissner-contact></meissner-contact>` inside the
contact section. The shared component reads `/assets/facts.json` and supplies
both contact links. Language follows nearest `lang` attribute. No fake form.
A noscript mailto fallback is recommended. Face owns copy provenance;
`assets/SHARED-COPY.md` documents the owner-history r7 fact schema.

The original Brian PNG is `/assets/logo-tentative-v0.png`, SHA256
0459218fdd6f3f9f13c5d7faafa581c41d9c109f5755e45253453a1963131c63.
`/assets/logo.svg` is the clean vector tracing; `/assets/favicon.svg` is a
simplified head-echo and server mark. Keep original and vector visible on review.
All major sections get IDs like `4.HERO`; shared JS shows tags with `?tags=1`.
Each variant supplies its own light/dark styles; `data-shared-theme` toggles
`html[data-theme]` on pages that choose the shared theme control. Existing
page-specific theme controls remain owned by each page lead.

Static hosting: GitHub Pages main/root, CNAME meissner.services, `.nojekyll`.
Root redirects to /1. Enforce HTTPS when GitHub's domain certificate is ready.
Preview locally with `python3 -m http.server 8764 --bind 127.0.0.1`.
