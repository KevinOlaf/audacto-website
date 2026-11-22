# Repository Guidelines

Static site for Audacto. No build step, package manager or framework.

## Structure

- Root pages: `index.html`, `privacy.html`, `404.html`. Clean routes use
  `directory/index.html` (`support/index.html` is `/support/`).
- Shared code lives in `assets/site.css` and `assets/site.js`. Fonts are
  self-hosted in `assets/fonts/`; images in `assets/img/`.
- Root files such as `CNAME`, `.nojekyll` and the favicons are hosting
  metadata. Keep their names and paths stable.

## Rules

- The site makes no third-party requests: no CDNs, analytics, embeds or
  remote fonts. Keep it that way; the privacy policy says so.
- Every product claim must match the shipping app. Check the Audacto repo
  before adding a feature, number or permission to any page.
- Colours, radii and spacing mirror the app's PrecisionDeck tokens and
  `DESIGN.md` in the Audacto repo. Magenta is reserved for the EQ response
  reflection, as in the app.
- Respect `prefers-reduced-motion`; keep hit targets at least 44 px.
- Two-space indentation in HTML, CSS and JS.

## Checks

- `python3 -m http.server 8000`, then load `/`, `/privacy.html`, `/support/`
  and a missing path at desktop and mobile widths with the console open.
- `git diff --check` and `git status --short` before committing.

## Commits

Short imperative summaries, one visible change each, e.g.
`Add support FAQ for missing files`.
