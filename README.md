# Audacto website

Marketing, privacy and support pages for Audacto, the offline audio player for
iPhone and iPad.

**Live site:** https://audacto.master-tempo.com

## Contents

- `index.html` — product page
- `privacy.html` — privacy policy (App Store privacy URL)
- `support/index.html` — support page, served at `/support/` (App Store support URL)
- `404.html` — not-found page
- `assets/` — shared CSS and JS, self-hosted fonts, images

## Local preview

```sh
python3 -m http.server 8000
open http://localhost:8000/
```

## Hosting

GitHub Pages from `main` at the repository root, with the custom domain in
`CNAME`. DNS for `master-tempo.com` needs one record:

| Type  | Host      | Value                 |
|-------|-----------|-----------------------|
| CNAME | `audacto` | `kevinolaf.github.io.` |

## Contact

support@master-tempo.com
