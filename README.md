# Meissner Services: seven marketing concepts

Live owner review: https://meissner.services/review/ . Every page is noindex and
has no trackers. Contact includes mailto + Brian's supplied WhatsApp number and the shared project
form posting to Cuz's api.meissner.services Worker. Turnstile is the sole permitted
third-party script; it loads only when a visitor opens the form. Notes are stored
in the project inbox, not claimed to arrive by email. No WhatsApp-to-email integration.

Shared checkout: `/home/brian/.local/share/gigchase/sites/meissner-services`.
Page leads own their numbered directories: Hannibal1/6/review; Face2/7;
Murdock3; B.A.4/assets/root/hosting; Amy5. Commit explicit leaf paths.

Include `/assets/shared.css`, then your page stylesheet, and defer
`/assets/shared.js`. Place `<meissner-contact></meissner-contact>` inside the
contact section. The shared component reads `/assets/facts.json` and supplies
both contact links and the project form. Language follows nearest `lang` attribute.
The form requires a message, either email or WhatsApp, and Turnstile verification.
It posts natively and shows the Worker redirect status; backend errors never claim success.
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

Superseding logo brief: each variant has its own takeoff of Brian’s operator/echo
idea. Workshop owns `/4/mark.svg`, `/4/favicon.svg` and section `4.LOGO`.
The shared vector tracing remains reference alongside the untouched original.
