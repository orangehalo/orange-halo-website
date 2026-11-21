# Assumptions log: Single Pension Contribution demo

Decisions made where the brief gave no guidance, and why. Figures named here live in `config.js`; change them there.

| Area | Decision | Why |
| --- | --- | --- |
| Stack | A static folder of HTML and ES modules, loading OHDS (components 4.3.0, tokens 4.2.0) from jsDelivr, in the website repo's `public/demos/single-contribution/` | OHDS's documented no-build route; the journey ships without touching the Astro site or any OHDS file |
| Pages | One HTML page with a route per step in the URL hash (`#/amount`), not a file per page | Answers stay in memory and `sessionStorage` between steps, the browser's Back works, and each route still gets its own title and focus |
| Steps | 8 steps: start, amount, eligibility, investment, payment method, check, pay, confirmation. Eligibility's three questions, the stop page and the two warnings count as step 3; fund choice and split count as step 4 | The brief's journey map has eight steps and three branches |
| Eligibility | Residence and age are two questions on one page; earnings and flexible access get a page each | One question per page "where possible": residence and age are both yes/no and only meaningful together |
| Earnings question | Asked as "Will you earn at least £[total] in 2026/27?" with Yes, No (or no earnings) and Not sure, and the total named in pounds | Avoids "gross" and "relevant UK earnings" in the question; the help explains what counts |
| Earnings limit | A warning page appears when the answer is No or Not sure and the total is over £3,600. The customer can continue or change the amount. Not sure isn't a stop | The brief says warnings inform and only minimum, maximum and format errors block; FR-10's stop is for eligibility that can't be confirmed (residence and age) |
| Stop page | Shown when the customer isn't a UK resident for tax or is 75 or over | These make tax relief impossible, so the journey can't confirm eligibility (FR-10) |
| MPAA | A page after "Yes" explains the £10,000 limit, warns if the total is over it, and offers Continue or Change the amount | FR-09, S4: explain and let them decide |
| Annual allowance | Warning on the amount page when the total is over £60,000 | It's the only limit known from the amount alone |
| Tax year end | Within 31 days of 5 April, a warning on the amount page says how many days are left and that the payment must reach Harbourline by 5 April; otherwise a plain sentence | S2. "Card and bank payments usually reach us the same day" is assumed |
| Timings | Payment shows in the plan within 2 working days; tax relief within 11 weeks; units bought the next working day; email within 1 hour | Not in the brief; plausible for relief at source, and all in `config.js` |
| £ per fund | The split's £ amounts are shares of what the customer pays (not the total with relief); the page says tax relief, when it arrives, is invested the same way | The customer types percentages of the payment they're making; relief arrives weeks later |
| Odd pennies | When a split doesn't divide exactly, the last fund takes the odd penny | So the funds always add up to the payment |
| Current funds | The plan is invested 70% Global Equity Index, 30% Balanced Mixed | Mocked; the brief asks the investment page to show the current funds and split |
| S6 | "Their current fund" is the Global Equity Index Fund; the "new sustainable fund" is the Sustainable Global Equity Fund | The scenario names neither |
| S4 amount | £12,000 (£15,000 with relief) | The scenario gives no amount; one over the MPAA shows the warning |
| S5 | Loads a half-finished payment and opens the start page, which offers "Carry on where you left off" | Shows leaving and coming back; "Leave and come back later" in the header is on every page |
| Fund order | Funds are listed by risk level, then as in the range | A neutral order: nothing is ranked by performance or marked as recommended |
| Fund filters | Risk is grouped as Lower (1 to 3), Medium (4 to 5) and Higher (6 to 7); filters in a group widen the list, filters across groups narrow it | Seven separate risk filters would be a long row of tags for 12 funds |
| Choosing funds | A fund is chosen with a checkbox on its card; chosen funds show as removable tags above the filters, so they stay visible when filtered out | FR-24, FR-26 |
| More than 5 funds | The sixth checkbox can be ticked; the error shows on Continue | The brief lists "You can choose up to 5 funds" as an error message, not a disabled state |
| Payment methods | The one-line descriptions are in the radio labels | `oh-radio-group` options have no hint (see the gap log) |
| Mocked payment | A plainly different "mock card payment page" / "mock banking app" screen, with buttons to succeed, decline or cancel; then a 2.5-second holding page | FR-17, FR-18; no card details are typed, so nothing that looks like a real payment form is shown |
| Reference number | `HL-` and six random digits, made when the mocked payment succeeds | Mocked |
| Print | "Print or save as PDF" opens the browser's print dialog; a print style hides the banner, header and buttons | FR-21: the browser's own "Save as PDF" covers download |
| Exits | "Leave and come back later" (and "Back to your plan" after paying) goes to a placeholder page saying what the real link would do; answers stay until the tab closes | FR-23 says exits are placeholder links, not built pages; a dead link would look broken |
| Back link on confirmation | None: the payment has been made | Going back would offer to pay again |
| Session timeout | 15 minutes; warning 2 minutes before, as a dialog with "Stay signed in" and "Sign out"; no ticking countdown. Moving between pages counts as activity. `?timeout=short` warns after 30 seconds | WCAG 2.2.1, and the brief's "no countdown pressure" |
| Signed out | A "You've been signed out" page; answers are kept for the tab | FR-22: no answers lost |
| Scenarios | `?scenario=s1` … `s6` load answers and open the page each scenario is about; links to all six are in the demo banner. `?today=YYYY-MM-DD` sets the date; `?theme=dark` tries OHDS's dark theme | "URL parameters to load S1 to S6 quickly (not a separate page)" |
| Fonts | Bricolage Grotesque from jsDelivr (`@fontsource`) | OHDS tokens name the brand's fonts but don't load them |
| Legal copy | The declaration and the terms link are placeholders, marked "needs compliance review" | As the brief says |
| Publishing path | `/demos/single-contribution/` | The brief leaves the path to be confirmed |
