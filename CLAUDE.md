# orangehalo.co.uk — AI brief

Astro site for [orangehalo.co.uk](https://orangehalo.co.uk), built with the **Orange Halo Design System (OHDS)** in the Orange Halo brand. OHDS lives in its own repo (`../orange-halo`); this site consumes it from npm.

## Use OHDS, don't rebuild it

- **What exists:** read OHDS's `llms.txt` (every component's API, the tier 2 token names, the rules): in the OHDS repo, or https://orangehalo.co.uk/ohds/llms.txt. The `ohds` MCP server in `.mcp.json` (`@orange-halo/mcp` from npm, run with npx, so no OHDS checkout is needed) answers the same questions (`list_components`, `get_component`, `find_tokens`, `get_rules`).
- **Loaded in `src/layouts/BaseLayout.astro`:** `@orange-halo/components` (all elements) and `@orange-halo/brand-orange-halo` (`oh-hero`); tokens via `src/styles/global.css` (`@orange-halo/tokens/brands/orange-halo.css`).
- **Build with OHDS components first.** If OHDS lacks something the site needs, add a row to "Reported by products" in the OHDS repo's `docs/component-gaps.md` (date, page, what was needed, what you built instead) rather than building a one-off here and leaving it unrecorded.
- **Style with tier 2 tokens only** (`var(--oh-color-surface-raised)`, `var(--oh-spacing-4)`, `var(--oh-typography-body-base-*)`): never a hex or px value, never a palette token (`--oh-color-orange-*`). A role's size and line height go together, so text stays on the grid.
- **Site-only classes** live in `src/styles/global.css`. Before adding one, check OHDS doesn't already have it.

## Check before you say you're done

```
npm run build
```

Then look at the changed pages in the browser at phone and desktop widths, and say what you checked.

## Deploy

With the `ftp-deploy` skill, from `dist/` (settings in `public/.ftp-deploy`): preview first, then `--live`, then compare the live files with the build. A merge doesn't deploy.
