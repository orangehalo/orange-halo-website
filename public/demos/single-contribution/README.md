# Single Pension Contribution: design demo

A clickable journey for making a one-off payment into a personal pension, built with the Orange Halo Design System (OHDS) as a test of the system. Harbourline Pensions isn't a real provider, and no payments are taken. Nothing entered leaves the browser: answers are kept in `sessionStorage` for the tab only.

Live at `https://orangehalo.co.uk/demos/single-contribution/`. Search engines are kept out by a robots meta tag and an `X-Robots-Tag` header (`.htaccess`); it isn't in a sitemap or linked from any indexed page.

## Run it

No build step. Serve the website's `public/` folder with any static server and open `/demos/single-contribution/`. Opening `index.html` from disk doesn't work, because browsers block ES modules on `file://`.

- `?scenario=s1` … `?scenario=s6` load one of the brief's scenarios. Links to all six are in the demo banner
- `?today=2027-03-28` sets today's date (S2 sets it for you)
- `?timeout=short` shows the timeout warning after 30 seconds; `?timeout=normal` sets it back
- `?theme=dark` tries OHDS's dark theme (opt-in, not yet reviewed against a design); `?theme=light` sets it back

## Folder

| File | What it is |
| --- | --- |
| `index.html` | The page: loads OHDS, the fonts and the app; robots meta tag; an import map (see the gap log) |
| `app.js` | Routing, state, every page, the timeout and the scenarios |
| `config.js` | Every rule, limit, date, timing and the mocked funds, so they can change each tax year |
| `money.js` | Parsing and validating amounts, the one tax relief calculation, and splits, all in pence |
| `journey.css` | The journey's own layout, in tier 2 OHDS tokens only |
| `proposed/ohp-affix-input.js` | **Proposed** component: a field with a £ prefix or % suffix |
| `proposed/ohp-risk-scale.js` | **Proposed** component: a fund's risk level on a 1 to 7 scale |
| `vendor-shim.js` | An empty module used by the import map |
| `.htaccess` | Sends `X-Robots-Tag: noindex, nofollow, noarchive` for the folder |
| `GAP-LOG.md` | What OHDS had, what was missing and what was done |
| `ASSUMPTIONS.md` | Decisions made without guidance, and why |

## Proposed versus existing OHDS

**Proposed** (in `proposed/`, prefixed `ohp-`, not part of the released system and not in Storybook): `ohp-affix-input`, `ohp-risk-scale`. Both use tier 2 tokens only, so they follow the dark theme, and each file opens with its design decisions, accessibility notes and states.

**Existing OHDS, used as released (components 4.3.0, tokens 4.2.0):** `oh-accordion`, `oh-alert`, `oh-badge`, `oh-button`, `oh-card`, `oh-checkbox`, `oh-cluster`, `oh-container`, `oh-description-list`, `oh-link`, `oh-modal`, `oh-progress`, `oh-radio-group`, `oh-skip-link`, `oh-spinner`, `oh-stack`, `oh-tag`, `oh-visually-hidden`, and `oh-hero` from `@orange-halo/brand-orange-halo` 3.0.0.

**Composed from existing components** (no new component; see the gap log): the journey header, back link, error summary, contribution breakdown, confirmation panel, fund list and fund card, and the running total.

No OHDS file, Storybook story or OHDS documentation was added or changed.

## Checked

- Breakdown for £100, £2,000, £2,880 and £10,000.50: £25 / £125, £500 / £2,500, £720 / £3,600, £2,500.13 / £12,500.63 (relief / total)
- Every error message in the brief, in the summary and on its field, with focus in the summary
- S1 to S6 end to end in the browser, the failed and cancelled payments, the stop page and the timeout dialog
- axe-core 4.10.2 on every page and state, light and dark: no serious or critical issues (one moderate, from `oh-modal`, in the gap log)
- No sideways scrolling at 320 px wide (the width 400% zoom gives on a 1280 px screen)
- No hex, px or rem values in the journey's CSS or JavaScript
- Not yet done: a VoiceOver walkthrough
