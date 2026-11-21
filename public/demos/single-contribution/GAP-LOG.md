# Gap log: Single Pension Contribution demo

What the journey needed, whether OHDS (components 4.3.0, tokens 4.2.0, brand-orange-halo 3.0.0) had it, and what was done. Levels follow the brief's order of preference: 1 use as is, 2 use a variant or prop, 3 compose from existing components, 4 extend with a new variant, 5 build new. Every row at level 3 or below is here, as the brief asks; level 1 and 2 rows are kept for completeness.

Checked against `llms.txt` and the component source on 2026-11-19; the callouts moved to `oh-alert` with components 4.3.0 on 2026-11-21.

## Components and patterns

| Item | Needed on | In OHDS? | Action taken | Notes for the system |
| --- | --- | --- | --- | --- |
| Minimal journey header | Every page | Partly: `oh-navbar` is a full site navigation with a drawer | Composed (3): `oh-container` + `oh-cluster` with the provider's name and an `oh-link` exit | Add a recipe for a transactional header: name, one exit, no navigation |
| Back link | Every page after the first | No: `oh-link` only has a forward arrow; `oh-breadcrumb` shows "Back to …" only below `size.breakpoint.sm` | Composed (3): `oh-link` reading "Back" | Add a back variant to `oh-link` (leading `chevron-left`, which already mirrors in RTL) |
| Step indicator | Every page | Partly: `oh-hero variant="journey"` has a progress bar, but it shows a percentage ("25%"), not "Step 2 of 8" | Used the hero (2) and slotted a visible "Step 2 of 8" line, hidden from screen readers, which hear it as the bar's name (3) | Add a way for the journey hero to show the step in words (e.g. `show-step`), and to hide the percentage, which means little for steps |
| Page heading | Every page | Yes: `oh-hero` renders the page's `h1` | Used as is (1) | The `h1` is in the shadow root, so a single-page journey can't move focus to it. The page focuses the hero host (`tabindex="-1"`), so screen readers read the journey name, heading and progress together. Add a `focusHeading()` method, or guidance for focus on route change |
| Text input | Amount, split | Yes: `oh-input` | Not used: the fields needed a prefix or suffix (see next row) | |
| Currency input with £ prefix | Amount | Partly: `oh-input` has no prefix, suffix, `inputmode` or width | Built `ohp-affix-input` (5, **Proposed**): `oh-input`'s look, tokens and attribute names, plus `prefix`, `suffix`, `affix-label`, `inputmode` and `width` | Recommend these as `oh-input` props (4), not a new element. Its hint sits before the field (it must be read before typing), where `oh-input` puts it after: decide one order for both |
| Percentage input | Split | No | `ohp-affix-input` with `suffix="%"` and `inputmode="numeric"` (5, **Proposed**) | As above |
| Radio group | Eligibility, earnings, flexible access, investment, payment method | Yes: `oh-radio-group` | Used as is (1) | Has no `helper-text`, so hints can't be linked with `aria-describedby` (the brief requires it): hints sit as paragraphs and expandable sections just before the group. Options have no hint either, so the payment methods' one-line descriptions are in the option labels. Its label can't be the page heading (no visually-hidden or heading-level option), so each page has a short `h1` and the question as the label |
| Checkbox | Declaration, key information, choosing a fund | Yes: `oh-checkbox` | Used as is (1) | |
| Fieldset and legend | Fund filters | Partly: `oh-checkbox-group` has one; `oh-tag` filters need the page's own | Composed (3): native `<fieldset>` and `<legend>` styled with `typography.control.*`, as `oh-tag`'s docs advise | A legend style (or a filter-group recipe) would save each product restyling it |
| Hint text | Amount, split | Partly: `helper-text` on `oh-input` | See the currency input row | |
| Error summary | Every question page | No | Composed (3): `oh-alert variant="error"` with an `h2` and a list of `oh-link`s; it takes focus on submit (`tabindex="-1"`), and each link focuses its field instead of changing the URL | Add `oh-error-summary`, or a recipe. `oh-alert` has no heading slot, and its links don't focus fields in shadow roots by themselves |
| Inline error message | Every question page | Yes: `error-text` on each control | Used as is (1) | Errors for a group with no control of its own (no fund chosen, the split's total) have nowhere to go: composed as text with an "Error:" prefix in `color.feedback.error` (3) |
| Warning callout | Amount, earnings limit, MPAA, tax year end | Yes: `oh-alert variant="warning"` | Used (2) | |
| Info and neutral callouts | MoneyHelper signposts, split note, fund advice, declaration, resume note | Yes: `oh-alert variant="info"` / `neutral` (4.3) | Used (2). The resume note was `oh-callout variant="brand"` with a refresh icon; it's now neutral, with no icon, since 4.3 dropped brand callouts and custom icons | |
| Callout bar | Every callout | **Fixed in 4.3:** `oh-callout`'s bar was a `border-inline-start` on a rounded box, so it tapered round the corners and looked cut off. OHDS deprecated `oh-callout` for `oh-alert`, which has a full frame | Moved to `oh-alert`; the square-corner override is gone | None |
| Expandable details | "What is tax relief?" and other help | Yes: `oh-accordion`, one item | Used (2) | |
| Summary list with change links | Check page | Yes: `oh-description-list` with `<dd data-actions>` and `oh-visually-hidden` | Used as is (1) | |
| Contribution breakdown | Amount, check, confirmation | No dedicated pattern | Composed (3): `oh-card variant="subtle"` + `oh-description-list`, the total row in `typography.emphasis.fontWeight`, and a polite live region that speaks once typing pauses | `oh-description-list` has no total or emphasised row: add `data-total` on an item |
| Primary and secondary buttons | Every page | Yes: `oh-button` | Used (2) | `oh-button` doesn't submit forms, so Enter in a field and the button's `oh-click` both call the page's submit (as documented) |
| Button with loading state | Pay | Yes: `oh-button loading` | Not needed: the payment hands off to a separate screen, then a holding page | |
| Text link | Throughout | Yes: `oh-link` | Used as is (1) | |
| Loading or holding state | Waiting for payment | Yes: `oh-spinner` with `label` | Used (2), with the page's own `role="status"` message, as `oh-spinner`'s docs advise | |
| Confirmation panel with reference | Confirmation | No | Composed (3): the hero's heading ("Payment received") + `oh-card variant="featured"` + `oh-description-list` | A confirmation panel recipe would help every transactional product |
| Timeout warning dialog | Every page | Yes: `oh-modal` with `dismissible` off | Used (2) | **Bug:** the modal's `<header>` is in its shadow root, so it's exposed as a second banner landmark when the page has its own header (axe `landmark-no-duplicate-banner`, moderate). Use a `<div>` for the modal header |
| Filterable fund list | Fund choice | No | Composed (3): `oh-tag` filters in fieldsets, a live count, a list of `oh-card`s | |
| Fund card | Fund choice | No | Composed (3): `oh-card`, `h3`, `oh-badge` (type), `ohp-risk-scale`, charge, details button, key information link, `oh-checkbox` | |
| Chosen funds | Fund choice | Yes: `oh-tag removable` | Used (2); focus moves to the next tag's × on removal, as its docs say | |
| Fund details without leaving the page | Fund choice | Yes: `oh-modal` | Used as is (1) | |
| Risk scale | Fund choice | No: no meter, and `oh-progress` is for progress | Built `ohp-risk-scale` (5, **Proposed**): level in words and number, steps drawn in one colour (no traffic lights, so no fund looks recommended) | Add a meter or scale component |
| Running total to 100% | Split | Partly: `oh-progress` | Composed (3): `oh-progress` + the total and £ in text, and a polite live region | `oh-progress` clamps at `max`, so going over 100% shows only in the text |

## Tokens

| Item | Needed on | In OHDS? | Action taken | Notes for the system |
| --- | --- | --- | --- | --- |
| Field widths by expected length | Amount, split | No token | Used sums of the nearest spacing tokens (`spacing.16` + `spacing.10`, `spacing.20` × 2) | Add input width tokens (e.g. `input.width.chars5`, `chars10`) |
| Link colour on `surface.inset` | Demo banner | No: `oh-link` is contrast-checked on `surface.base` and card surfaces only; on `surface.inset` axe reported a `color-contrast` failure (serious) | Moved the banner onto `surface.base` | Add an inset pair to `check:contrast`, or a link-on-inset token |
| Emphasised total row | Breakdown | No | `typography.emphasis.fontWeight` on the row | See the breakdown row |

## Delivery, guidance and conflicts with the brief

| Item | Needed on | In OHDS? | Action taken | Notes for the system |
| --- | --- | --- | --- | --- |
| Loading the brand package from the CDN | Every page | Conflict: `@orange-halo/brand-orange-halo@3.0.0`'s jsDelivr build imports `components@4.0.0/oh-progress.js`, which defines `oh-progress` a second time after the 4.3.0 bundle and throws | An import map points that import at an empty module (`vendor-shim.js`) | Republish the brand package against components 4.3, or make its components import a peer the CDN can share. `llms.txt`'s no-build instructions don't mention the brand package |
| Loading single components from the CDN | Every page | Conflict: each `components@4.3.0/oh-*.js/+esm` file bundles the elements it uses (`oh-button` includes `oh-spinner`), so loading two of them defines one twice | Loaded the whole `components@4.3.0/+esm` bundle | Document that only the bundle works without a build step |
| Works without JavaScript | Every page | Conflict: the brief asks for the core form to submit without JavaScript "where the OHDS stack allows"; OHDS is web components, so it doesn't | A `<noscript>` message | None needed: recorded as the stack's limit |
| Hint linked with `aria-describedby` | Radio pages | Conflict: see the radio group row | Hints placed before the group, in reading order | |
| Focus on each new page | Every page | No guidance for single-page journeys | Focus moves to the hero on every route change | Add focus-on-route guidance to `llms.txt` |
| Dark theme | Every page | Yes, opt-in and not yet reviewed against a design | Both Proposed components use tier 2 tokens only and follow it; `?theme=dark` tries it. axe: no issues | |
