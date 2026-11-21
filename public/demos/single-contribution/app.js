/**
 * Single Pension Contribution: a design demo built with the Orange Halo
 * Design System. Harbourline Pensions isn't a real provider; nothing
 * entered leaves the browser, and answers live in sessionStorage only.
 *
 * Pages are routes in the URL hash (#/amount). Each route renders into
 * <main>, then focus moves to the page heading (the oh-hero).
 */

import { html, render, nothing } from "https://cdn.jsdelivr.net/npm/lit@3.3.3/+esm";

// OHDS 4.3.0 (components; tokens 4.2.0), then the brand's oh-hero (see the import map in index.html)
await import("https://cdn.jsdelivr.net/npm/@orange-halo/components@4.3.0/+esm");
await import("https://cdn.jsdelivr.net/npm/@orange-halo/brand-orange-halo@3.0.0/oh-hero.js/+esm");
await import("./proposed/ohp-affix-input.js");
await import("./proposed/ohp-risk-scale.js");

import { config } from "./config.js";
import {
  parseAmount, breakdown, formatPounds, netForGross, splitAmounts, parsePercent,
} from "./money.js";

const { limits, taxYear } = config;

/** Wait for the render to land. (Not requestAnimationFrame, which a
    background tab never fires, leaving focus behind.) */
const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));
const fundById = Object.fromEntries(config.funds.map((f) => [f.id, f]));

/* ═══════════════════════════════════════════════════════════════
   State: answers in sessionStorage, never sent anywhere
   ═══════════════════════════════════════════════════════════════ */

const STORE = "harbourline-demo-single-contribution";

const blank = () => ({
  amount: "",
  resident: "",
  under75: "",
  earnings: "",
  earningsAck: 0,
  flexible: "",
  mpaaAck: 0,
  invest: "",
  funds: [],
  split: {},
  kidConfirmed: false,
  method: "",
  declaration: false,
  outcome: "",
  payment: null,
  lastRoute: "",
  today: "",
});

let state = load();

function load() {
  try {
    return { ...blank(), ...JSON.parse(sessionStorage.getItem(STORE) || "{}") };
  } catch {
    return blank();
  }
}

function save() {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(state));
  } catch {
    /* Private mode: the journey still works, it just forgets on reload. */
  }
}

function set(changes) {
  state = { ...state, ...changes };
  save();
}

/** The amount, in pence, if it's valid. */
const net = () => parseAmount(state.amount).pence ?? 0;
const sums = () => breakdown(net());

/** "Today", overridable for scenario S2 (?today=2027-03-28). */
function today() {
  return state.today ? new Date(`${state.today}T12:00:00`) : new Date();
}

const longDate = (date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const taxYearEnd = new Date(`${taxYear.end}T12:00:00`);
const daysToYearEnd = () =>
  Math.max(0, Math.ceil((taxYearEnd - today()) / (24 * 60 * 60 * 1000)));

/* ═══════════════════════════════════════════════════════════════
   The flow: which pages apply, given the answers so far
   ═══════════════════════════════════════════════════════════════ */

const needsEarningsWarning = () =>
  state.earnings && state.earnings !== "yes" && sums().gross > limits.noEarningsGross;

const needsMpaa = () => state.flexible === "yes";

/** Every page on the path through the journey, in order. */
function flow() {
  const pages = ["start", "amount", "eligibility"];
  if (state.resident === "no" || state.under75 === "no") return [...pages, "stop"];
  pages.push("earnings");
  if (needsEarningsWarning()) pages.push("earnings-limit");
  pages.push("flexible");
  if (needsMpaa()) pages.push("mpaa");
  pages.push("investment");
  if (state.invest === "new") pages.push("funds", "split");
  pages.push("method", "check", "pay");
  return pages;
}

/** Has this page been answered (for the current amount)? */
function complete(page) {
  switch (page) {
    case "start": return true;
    case "amount": return !!parseAmount(state.amount).pence;
    case "eligibility": return state.resident === "yes" && state.under75 === "yes";
    case "earnings": return !!state.earnings;
    case "earnings-limit": return state.earningsAck === sums().gross;
    case "flexible": return !!state.flexible;
    case "mpaa": return state.mpaaAck === sums().gross;
    case "investment": return !!state.invest;
    case "funds": return state.funds.length > 0 && state.funds.length <= limits.maxFunds;
    case "split": return splitIsValid() && state.kidConfirmed;
    case "method": return !!state.method;
    case "check": return state.declaration;
    default: return false;
  }
}

/** The step number shown in the progress bar for each page. */
const STEP = {
  start: 1, amount: 2, eligibility: 3, earnings: 3, "earnings-limit": 3, flexible: 3,
  mpaa: 3, stop: 3, investment: 4, funds: 4, split: 4, method: 5, check: 6,
  pay: 7, processing: 7, failed: 7, confirmation: 8,
};

function firstIncomplete() {
  return flow().find((page) => !complete(page)) ?? "check";
}

/** Where Continue goes from a page. In change mode, straight back to check. */
function nextPage(page, changing) {
  const pages = flow();
  const after = pages.slice(pages.indexOf(page) + 1);
  if (changing) return after.find((p) => !complete(p) || p === "check") ?? "check";
  return after[0] ?? "check";
}

function previousPage(page) {
  const pages = flow();
  const index = pages.indexOf(page);
  return index > 0 ? pages[index - 1] : null;
}

/* ═══════════════════════════════════════════════════════════════
   Routing
   ═══════════════════════════════════════════════════════════════ */

const PAGES = {};
const OPEN_PAGES = new Set(["start", "exit", "signed-out", "terms-placeholder"]);

function currentRoute() {
  const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
  return { page: path || "start", changing: query.includes("change") };
}

function go(page, { changing = false } = {}) {
  location.hash = `#/${page}${changing ? "?change" : ""}`;
}

let firstRender = true;
let errors = [];
let shownRoute = "";

function route() {
  // An in-page link (the skip link's #main) isn't a page: put the page's
  // address back and move focus to the target instead.
  if (location.hash && !location.hash.startsWith("#/")) {
    const target = document.getElementById(location.hash.slice(1));
    history.replaceState(null, "", shownRoute || "#/start");
    target?.focus();
    return;
  }
  shownRoute = location.hash || "#/start";

  const { page, changing } = currentRoute();
  if (!PAGES[page]) return go("start");

  // A page can only be reached once the pages before it are answered.
  const pages = flow();
  // A branch page that doesn't apply to these answers (such as #/mpaa after
  // "No") goes to the next unanswered page instead.
  const branch = ["stop", "earnings-limit", "mpaa", "funds", "split"];
  if (branch.includes(page) && !pages.includes(page)) return go(firstIncomplete());
  if (!OPEN_PAGES.has(page) && pages.includes(page)) {
    const gap = pages.slice(0, pages.indexOf(page)).find((p) => !complete(p));
    if (gap) return go(gap);
  }
  if (["processing", "failed"].includes(page) && !state.method) return go(firstIncomplete());
  if (page === "confirmation" && !state.payment) return go(firstIncomplete());

  // Remember where they are, so the start page can offer to carry on (S5).
  if (!["start", "exit", "signed-out", "terms-placeholder"].includes(page)) set({ lastRoute: page });
  errors = [];
  draw(page, changing);
  sessionTimer.activity();

  if (!firstRender) {
    window.scrollTo(0, 0);
    focusHeading();
  }
  firstRender = false;
}

function draw(page = currentRoute().page, changing = currentRoute().changing) {
  const view = PAGES[page]({ page, changing });
  document.title = `${errors.length ? "Error: " : ""}${view.title} – ${config.journeyName} – ${config.provider} (design demo)`;
  render(shell(page, changing, view), document.getElementById("app"));
}

async function focusHeading() {
  await nextTick();
  const hero = document.querySelector("oh-hero");
  if (hero) {
    hero.setAttribute("tabindex", "-1");
    hero.focus();
  }
}

/* ═══════════════════════════════════════════════════════════════
   Shell: demo banner, header, back link, hero, page
   ═══════════════════════════════════════════════════════════════ */

const SCENARIOS = ["s1", "s2", "s3", "s4", "s5", "s6"];

function shell(page, changing, view) {
  const back = view.back === undefined ? defaultBack(page, changing) : view.back;
  return html`
    <header>
    <oh-skip-link href="#main"></oh-skip-link>
    <div class="demo-banner">
      <oh-container size="md">
        <oh-stack gap="xs">
          <p>
            <strong>This is a design demo. Harbourline Pensions isn't a real provider and no
            payments are taken.</strong>
          </p>
          <p class="secondary">
            Load a scenario:
            ${SCENARIOS.map(
              (s, i) => html`<oh-link href="?scenario=${s}">S${i + 1}</oh-link>${i < SCENARIOS.length - 1 ? " · " : ""}`
            )}
          </p>
        </oh-stack>
      </oh-container>
    </div>

    <div class="journey-header">
      <oh-container size="md">
        <oh-cluster justify="between" gap="sm">
          <span class="provider">${config.provider}</span>
          ${view.exit === false
            ? nothing
            : html`<oh-link href=${config.links.exit}>${view.exit ?? "Leave and come back later"}</oh-link>`}
        </oh-cluster>
      </oh-container>
    </div>
    </header>

    <main id="main" tabindex="-1" @click=${onMainClick}>
      ${back
        ? html`<div class="back"><oh-container size="md"><oh-link href=${back.href}>Back</oh-link></oh-container></div>`
        : html`<div class="back"></div>`}
      <oh-hero
        variant="journey"
        size="md"
        journey-name=${view.journeyName ?? config.journeyName}
        heading=${view.title}
        current-step=${STEP[page] ?? 1}
        total-steps=${config.totalSteps}
      >
        <!-- The hero's bar shows a percentage; say the step in words too.
             Hidden from screen readers, which hear it as the bar's name. -->
        <p class="hero-step" aria-hidden="true">Step ${STEP[page] ?? 1} of ${config.totalSteps}</p>
      </oh-hero>
      <div class="page">
        <oh-container size="md">
          <oh-stack gap="lg">
            ${errors.length ? errorSummary() : nothing}
            ${view.body}
          </oh-stack>
        </oh-container>
      </div>
    </main>
    ${timeoutModal()}
  `;
}

function defaultBack(page, changing) {
  if (page === "start" || page === "confirmation") return null;
  if (changing) return { href: "#/check" };
  const previous = previousPage(page);
  return previous ? { href: `#/${previous}` } : { href: "#/start" };
}

/** Error summary links focus their field instead of changing the hash. */
function onMainClick(event) {
  const link = event.composedPath().find((el) => el.dataset?.field);
  if (!link) return;
  event.preventDefault();
  focusControl(document.getElementById(link.dataset.field));
}

function focusControl(el) {
  if (!el) return;
  el.scrollIntoView({ block: "center" });
  const inner = el.shadowRoot?.querySelector("input, button, [tabindex]");
  (inner ?? el).focus();
}

/* ═══════════════════════════════════════════════════════════════
   Errors: a summary at the top (oh-alert) and each field's error-text
   ═══════════════════════════════════════════════════════════════ */

function errorSummary() {
  return html`
    <oh-alert variant="error" class="error-summary" tabindex="-1">
      <h2 class="h2">There is a problem</h2>
      <ul>
        ${errors.map(
          (e) => html`<li><oh-link href="#${e.field}" data-field=${e.field}>${e.message}</oh-link></li>`
        )}
      </ul>
    </oh-alert>
  `;
}

const errorFor = (field) => errors.find((e) => e.field === field)?.message ?? "";

/** Show errors (or go on). Focus moves to the summary. */
async function fail(list) {
  errors = list;
  draw();
  errors = list;
  await nextTick();
  document.querySelector(".error-summary")?.focus();
}

function continueFrom(page, changing) {
  go(nextPage(page, changing), { changing: changing && nextPage(page, changing) !== "check" });
}

/* ═══════════════════════════════════════════════════════════════
   Shared bits
   ═══════════════════════════════════════════════════════════════ */

const button = (label, onClick, variant = "primary") =>
  html`<oh-button variant=${variant} @oh-click=${onClick}>${label}</oh-button>`;

/** A form: Enter in a field submits, as it would natively. */
const form = (onSubmit, body) => html`
  <form novalidate @submit=${(e) => { e.preventDefault(); onSubmit(); }}
    @keydown=${(e) => { if (e.key === "Enter" && e.target.localName === "ohp-affix-input") { e.preventDefault(); onSubmit(); } }}>
    <oh-stack gap="lg">${body}</oh-stack>
  </form>
`;

const moneyHelper = (lead = "Not sure what to do?") => html`
  <oh-alert variant="info">
    <p>
      <strong>${lead}</strong> MoneyHelper gives free, impartial guidance on pensions, backed by
      the government.
      <oh-link href=${config.links.moneyHelper} target="_blank">Get guidance from MoneyHelper</oh-link>
    </p>
  </oh-alert>
`;

const noAdvice = html`<p class="secondary">We can't give advice or tell you how much to pay in.</p>`;

const riskNote = html`
  <p class="secondary">
    The value of investments can go down as well as up, so you could get back less than you pay in.
  </p>
`;

function breakdownList(b = sums(), id = "") {
  return html`
    <oh-description-list id=${id || nothing}>
      <dl>
        <div><dt>You pay</dt><dd class="figure">${formatPounds(b.net)}</dd></div>
        <div><dt>Tax relief added</dt><dd class="figure">${formatPounds(b.relief)}</dd></div>
        <div class="breakdown-total">
          <dt>Total going into your pension</dt><dd class="figure">${formatPounds(b.gross)}</dd>
        </div>
      </dl>
    </oh-description-list>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   1. Start
   ═══════════════════════════════════════════════════════════════ */

PAGES.start = () => {
  const resume = state.lastRoute && !["start", "confirmation"].includes(state.lastRoute) && state.amount;
  return {
    title: "Pay a lump sum into your pension",
    back: null,
    body: html`
      ${resume
        ? html`<oh-stack gap="sm">
            <!-- The alert holds the message only: it's a passive note, and
                 its layout isn't made for actions. The choices sit below. -->
            <oh-alert variant="neutral">
              <p><strong>You have a payment you haven't finished.</strong> Your answers are saved
                until you close this browser tab.</p>
            </oh-alert>
            <oh-cluster gap="sm">
              <oh-button href="#/${firstIncomplete()}">Carry on where you left off</oh-button>
              ${button("Start again", () => { state = { ...blank(), today: state.today }; save(); go("amount"); }, "secondary")}
            </oh-cluster>
          </oh-stack>`
        : nothing}
      <p>Use this service to make a one-off payment into your Harbourline personal pension.</p>
      <h2>What happens</h2>
      <ol>
        <li>Tell us how much you want to pay in.</li>
        <li>Answer 3 questions to check you can get tax relief.</li>
        <li>Choose how to invest it: the same as now, or in different funds.</li>
        <li>Check your answers and pay.</li>
      </ol>
      <p>We'll then claim tax relief from HMRC and add it to your pension.</p>
      <h2>Before you start</h2>
      <ul>
        <li>It takes about 5 minutes.</li>
        <li>You'll need a UK debit card, or access to your online or mobile banking.</li>
        <li>You can leave at any time. Nothing is taken until you confirm the payment.</li>
      </ul>
      ${resume ? nothing : html`<div><oh-button href="#/amount" size="lg">Start now</oh-button></div>`}
      ${moneyHelper("Want to talk it through first?")}
    `,
  };
};

/* ═══════════════════════════════════════════════════════════════
   2. Amount
   ═══════════════════════════════════════════════════════════════ */

let announceTimer;

function onAmountInput(event) {
  set({ amount: event.detail.value });
  draw();
  // Announce the breakdown once typing pauses, not on every keystroke.
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    const region = document.getElementById("breakdown-announce");
    if (!region) return;
    const parsed = parseAmount(state.amount);
    if (!parsed.pence) {
      region.textContent = "";
      return;
    }
    const b = breakdown(parsed.pence);
    region.textContent = `You pay ${formatPounds(b.net)}. Tax relief added ${formatPounds(b.relief)}. Total going into your pension ${formatPounds(b.gross)}.`;
  }, 1000);
}

PAGES.amount = ({ changing }) => {
  const parsed = parseAmount(state.amount);
  const valid = !!parsed.pence;
  const b = valid ? breakdown(parsed.pence) : null;
  const days = daysToYearEnd();
  const lateInYear = days <= 31;

  const submit = () => {
    const result = parseAmount(state.amount);
    if (result.error) return fail([{ field: "amount", message: result.error }]);
    continueFrom("amount", changing);
  };

  return {
    title: "How much do you want to pay in?",
    body: form(submit, html`
      <p>This is the amount you'll pay from your card or bank account. We'll then add tax relief to it.</p>
      ${noAdvice}
      <ohp-affix-input
        id="amount"
        label="Amount you will pay"
        affix-label="in pounds"
        prefix="£"
        inputmode="decimal"
        autocomplete="off"
        width="chars-10"
        helper-text="For example, 2000 or 2000.50. The least you can pay is ${formatPounds(limits.minimumNet)}."
        .value=${state.amount}
        error-text=${errorFor("amount")}
        @oh-input=${onAmountInput}
      ></ohp-affix-input>

      <oh-card variant="subtle" aria-labelledby="breakdown-heading">
        <oh-stack gap="sm">
          <h2 id="breakdown-heading" class="h2">What goes into your pension</h2>
          ${valid
            ? breakdownList(b)
            : html`<p class="secondary">Enter an amount to see how much tax relief will be added.</p>`}
          <div aria-live="polite"><oh-visually-hidden id="breakdown-announce"></oh-visually-hidden></div>
        </oh-stack>
      </oh-card>

      ${valid && b.gross > limits.annualAllowanceGross
        ? html`<oh-alert variant="warning">
            <p><strong>This is more than the annual allowance.</strong> Most people can pay in up to
              ${formatPounds(limits.annualAllowanceGross)} a year across all their pensions, including
              tax relief and any payments from an employer. With tax relief, this payment is
              ${formatPounds(b.gross)}. Above the allowance you may have to pay a tax charge. You
              can still continue.</p>
          </oh-alert>`
        : nothing}

      <oh-stack gap="sm">
        <p><strong>Tax relief arrives later.</strong> We claim it from HMRC after your payment
          reaches us. It's usually added to your pension ${config.timings.reliefAdded}.</p>
        <p>We add tax relief at the basic rate of ${config.basicRatePercent}%. If you pay tax at a
          higher rate, you can claim the extra relief yourself through a Self Assessment tax return.</p>
      </oh-stack>

      ${lateInYear
        ? html`<oh-alert variant="warning">
            <p><strong>The ${taxYear.label} tax year ends in ${days} ${days === 1 ? "day" : "days"}.</strong>
              This payment counts towards ${taxYear.label} only if it reaches us by
              ${longDate(taxYearEnd)}. Card and bank payments usually reach us the same day. After
              that, it counts towards the next tax year.</p>
          </oh-alert>`
        : html`<p>This payment counts towards the ${taxYear.label} tax year, which ends on
            ${longDate(taxYearEnd)}. To count for ${taxYear.label}, it must reach us by then.</p>`}

      <oh-accordion .items=${[{ heading: "What is tax relief?" }]} heading-level="2">
        <div slot="item-0">
          <p>Tax relief is money the government adds to your pension. For every £80 you pay in, we
            claim £20 from HMRC, so £100 goes into your pension.</p>
        </div>
      </oh-accordion>

      ${moneyHelper("Not sure how much to pay in?")}
      <div>${button("Continue", submit)}</div>
    `),
  };
};

/* ═══════════════════════════════════════════════════════════════
   3. Eligibility: residence and age, earnings, flexible access
   ═══════════════════════════════════════════════════════════════ */

const YES_NO = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

PAGES.eligibility = ({ changing }) => {
  const submit = () => {
    const list = [];
    if (!state.resident) list.push({ field: "resident", message: "Select yes if you're a UK resident for tax purposes" });
    if (!state.under75) list.push({ field: "under75", message: "Select yes if you're under 75" });
    if (list.length) return fail(list);
    continueFrom("eligibility", changing);
  };
  return {
    title: "Check you can get tax relief",
    body: form(submit, html`
      <p>Tax relief is only added for people who are UK residents for tax and under 75.</p>
      <oh-radio-group
        id="resident"
        label="Are you a UK resident for tax purposes?"
        .options=${YES_NO}
        .value=${state.resident}
        error-text=${errorFor("resident")}
        @oh-change=${(e) => set({ resident: e.detail.value })}
      ></oh-radio-group>
      <oh-accordion .items=${[{ heading: "What does UK resident for tax purposes mean?" }]} heading-level="2">
        <div slot="item-0">
          <p>You're usually a UK resident for tax if you spend 183 days or more in the UK in the tax
            year, or your only home is in the UK. If you're not sure, check with HMRC or MoneyHelper.</p>
        </div>
      </oh-accordion>
      <oh-radio-group
        id="under75"
        label="Are you under 75?"
        .options=${YES_NO}
        .value=${state.under75}
        error-text=${errorFor("under75")}
        @oh-change=${(e) => set({ under75: e.detail.value })}
      ></oh-radio-group>
      <div>${button("Continue", submit)}</div>
    `),
  };
};

PAGES.stop = () => ({
  title: "We can't take this payment online",
  body: html`
    <p>${state.resident === "no"
      ? "You told us you're not a UK resident for tax purposes."
      : "You told us you're 75 or over."}
      Tax relief can't be added to this payment, so we can't take it through this service.</p>
    <p>Nothing has been taken.</p>
    <h2>What you can do</h2>
    <ul>
      <li>Call us on ${config.contact.phone} (${config.contact.hours}) to talk about other ways to pay in.</li>
      <li><oh-link href="#/eligibility?change">Change your answer</oh-link> if it wasn't right.</li>
    </ul>
    ${moneyHelper("Free help is available.")}
    <div><oh-button href=${config.links.exit} variant="secondary">Leave this service</oh-button></div>
  `,
});

PAGES.earnings = ({ changing }) => {
  const b = sums();
  const submit = () => {
    if (!state.earnings) {
      return fail([{ field: "earnings", message: "Select yes, no or not sure" }]);
    }
    continueFrom("earnings", changing);
  };
  return {
    title: "Your earnings this tax year",
    body: form(submit, html`
      <p>With tax relief, ${formatPounds(b.gross)} will go into your pension. You can only get tax
        relief on payments up to the amount you earn in the ${taxYear.label} tax year, across all
        your pensions.</p>
      <p>If you don't earn anything, or earn less, you can still get tax relief on up to
        ${formatPounds(limits.noEarningsGross)} a year in total, which means paying in
        ${formatPounds(netForGross(limits.noEarningsGross))} yourself.</p>
      <oh-radio-group
        id="earnings"
        label="Will you earn at least ${formatPounds(b.gross)} in the ${taxYear.label} tax year?"
        .options=${[
          { label: "Yes", value: "yes" },
          { label: "No, or I don't have any earnings", value: "no" },
          { label: "I'm not sure", value: "not-sure" },
        ]}
        .value=${state.earnings}
        error-text=${errorFor("earnings")}
        @oh-change=${(e) => set({ earnings: e.detail.value })}
      ></oh-radio-group>
      <oh-accordion .items=${[{ heading: "What counts as earnings?" }]} heading-level="2">
        <div slot="item-0">
          <oh-stack gap="sm">
            <p>Count your salary, wages, bonuses and income from self-employment, before tax.</p>
            <p>Don't count pension income, savings interest, dividends or rental income (unless it's
              from furnished holiday lettings).</p>
          </oh-stack>
        </div>
      </oh-accordion>
      <div>${button("Continue", submit)}</div>
    `),
  };
};

PAGES["earnings-limit"] = ({ changing }) => {
  const b = sums();
  const capNet = netForGross(limits.noEarningsGross);
  return {
    title: "Tax relief may not apply to all of this payment",
    body: html`
      <oh-alert variant="warning">
        <p>${state.earnings === "no"
          ? "You told us you'll earn less than the total going into your pension, or nothing."
          : "You told us you're not sure what you'll earn."}
          You can only get tax relief on up to ${formatPounds(limits.noEarningsGross)} a year, or what
          you earn if that's more. With tax relief, this payment is ${formatPounds(b.gross)}.</p>
      </oh-alert>
      <p>If tax relief is added that you're not entitled to, HMRC can take it back, and you may have to
        pay a charge.</p>
      <p>Without earnings, the most you can pay in yourself and get full tax relief is
        ${formatPounds(capNet)} a year, across all your pensions.</p>
      ${noAdvice}
      ${moneyHelper()}
      <oh-cluster gap="sm">
        ${button(`Continue with ${formatPounds(b.net)}`, () => {
          set({ earningsAck: b.gross });
          continueFrom("earnings-limit", changing);
        })}
        <oh-button variant="secondary" href="#/amount?change">Change the amount</oh-button>
      </oh-cluster>
    `,
  };
};

PAGES.flexible = ({ changing }) => {
  const submit = () => {
    if (!state.flexible) {
      return fail([{ field: "flexible", message: "Select yes if you've taken money flexibly from a pension" }]);
    }
    continueFrom("flexible", changing);
  };
  return {
    title: "Money you've taken from a pension",
    body: form(submit, html`
      <p>Taking money flexibly includes taking an income from drawdown, or taking a lump sum from a
        pension on top of your tax-free cash.</p>
      <p>It doesn't include taking only your tax-free cash, or buying an annuity.</p>
      <oh-radio-group
        id="flexible"
        label="Have you taken money flexibly from any pension?"
        .options=${YES_NO}
        .value=${state.flexible}
        error-text=${errorFor("flexible")}
        @oh-change=${(e) => set({ flexible: e.detail.value })}
      ></oh-radio-group>
      <div>${button("Continue", submit)}</div>
    `),
  };
};

PAGES.mpaa = ({ changing }) => {
  const b = sums();
  const over = b.gross > limits.mpaaGross;
  return {
    title: "Your yearly limit is lower",
    body: html`
      <p>Because you've taken money flexibly from a pension, a lower limit applies to what can be paid
        into your pensions. It's called the money purchase annual allowance.</p>
      <p>The limit is ${formatPounds(limits.mpaaGross)} a year, across all your pensions. It includes
        tax relief and any payments from an employer.</p>
      ${over
        ? html`<oh-alert variant="warning">
            <p><strong>This payment is over the limit.</strong> With tax relief, ${formatPounds(b.gross)}
              will go into your pension, which is more than ${formatPounds(limits.mpaaGross)}. You may
              have to pay a tax charge on the amount over the limit.</p>
          </oh-alert>`
        : html`<p>With tax relief, this payment is ${formatPounds(b.gross)}. Remember to count anything
            else paid into your pensions this tax year.</p>`}
      ${noAdvice}
      ${moneyHelper()}
      <oh-cluster gap="sm">
        ${button(`Continue with ${formatPounds(b.net)}`, () => {
          set({ mpaaAck: b.gross });
          continueFrom("mpaa", changing);
        })}
        <oh-button variant="secondary" href="#/amount?change">Change the amount</oh-button>
      </oh-cluster>
    `,
  };
};

/* ═══════════════════════════════════════════════════════════════
   4. Investment: same as now, or new funds (choice, then split)
   ═══════════════════════════════════════════════════════════════ */

function currentFundsList() {
  const amounts = splitAmounts(net(), config.currentFunds.map((f) => f.percent));
  return html`
    <oh-description-list>
      <dl>
        ${config.currentFunds.map(
          (f, i) => html`<div>
            <dt>${fundById[f.id].name}</dt>
            <dd class="figure">${f.percent}% (${formatPounds(amounts[i])})</dd>
          </div>`
        )}
      </dl>
    </oh-description-list>
  `;
}

PAGES.investment = ({ changing }) => {
  const submit = () => {
    if (!state.invest) {
      return fail([{ field: "invest", message: "Select how you want to invest this payment" }]);
    }
    continueFrom("investment", changing);
  };
  return {
    title: "How to invest this payment",
    body: form(submit, html`
      <h2>How your plan is invested now</h2>
      ${currentFundsList()}
      <oh-radio-group
        id="invest"
        label="How do you want to invest ${formatPounds(net())}?"
        .options=${[
          { label: "The same way as now", value: "current" },
          { label: "Choose different funds for this payment", value: "new" },
        ]}
        .value=${state.invest}
        error-text=${errorFor("invest")}
        @oh-change=${(e) => set({ invest: e.detail.value })}
      ></oh-radio-group>
      <p class="secondary">Choosing different funds only changes how this payment, and the tax relief
        that follows it, is invested. Money already in your plan stays where it is.</p>
      ${riskNote}
      <div>${button("Continue", submit)}</div>
    `),
  };
};

/* Funds: filter, choose up to 5, read details in a dialog */

const RISK_BANDS = [
  { value: "lower", label: "Lower (1 to 3)", test: (r) => r <= 3 },
  { value: "medium", label: "Medium (4 to 5)", test: (r) => r >= 4 && r <= 5 },
  { value: "higher", label: "Higher (6 to 7)", test: (r) => r >= 6 },
];
const FUND_TYPES = [...new Set(config.funds.map((f) => f.type))];
let filters = { risk: new Set(), type: new Set() };
let detailsFund = null;
let detailsOpener = null;

function visibleFunds() {
  return config.funds.filter(
    (f) =>
      (!filters.risk.size || RISK_BANDS.some((b) => filters.risk.has(b.value) && b.test(f.risk))) &&
      (!filters.type.size || filters.type.has(f.type))
  );
}

function toggleFilter(group, value, on) {
  const next = new Set(filters[group]);
  on ? next.add(value) : next.delete(value);
  filters = { ...filters, [group]: next };
  draw();
}

function toggleFund(id, on) {
  const funds = on ? [...new Set([...state.funds, id])] : state.funds.filter((f) => f !== id);
  const split = { ...state.split };
  if (!on) delete split[id];
  set({ funds, split, kidConfirmed: false });
  draw();
}

async function removeChosen(id) {
  const index = state.funds.indexOf(id);
  toggleFund(id, false);
  await nextTick();
  // Focus the next remaining tag's ×, or the heading of the list.
  const tags = [...document.querySelectorAll("#chosen oh-tag")];
  const next = tags[Math.min(index, tags.length - 1)];
  if (next) next.shadowRoot?.querySelector("button")?.focus();
  else document.getElementById("chosen-heading")?.focus();
}

function fundCard(f) {
  const chosen = state.funds.includes(f.id);
  return html`
    <li>
      <oh-card variant=${chosen ? "default" : "subtle"}>
        <oh-stack gap="sm">
          <h3>${f.name}</h3>
          <oh-cluster gap="xs"><oh-badge>${f.type}</oh-badge></oh-cluster>
          <ohp-risk-scale level=${f.risk} words=${config.riskWords[f.risk]}></ohp-risk-scale>
          <p class="small">Ongoing charge: ${f.charge}% a year</p>
          <oh-cluster gap="md">
            <oh-button size="sm" variant="secondary" @oh-click=${(e) => {
              detailsFund = f.id;
              detailsOpener = e.target;
              draw();
            }}>Fund details<oh-visually-hidden>: ${f.name}</oh-visually-hidden></oh-button>
            <oh-link href="#/kid-placeholder" @click=${(e) => e.preventDefault()}>Key information document<oh-visually-hidden> for ${f.name}</oh-visually-hidden> (placeholder)</oh-link>
          </oh-cluster>
          <oh-checkbox
            label="Choose ${f.name}"
            ?checked=${chosen}
            @oh-change=${(e) => toggleFund(f.id, e.detail.checked)}
          ></oh-checkbox>
        </oh-stack>
      </oh-card>
    </li>
  `;
}

function fundDetailsModal() {
  const f = fundById[detailsFund];
  if (!f) return nothing;
  const close = () => {
    detailsFund = null;
    draw();
    detailsOpener?.focus();
  };
  return html`
    <oh-modal open heading=${f.name} @oh-close=${close}>
      <oh-stack gap="md">
        <p>${f.about}</p>
        <oh-description-list>
          <dl>
            <div><dt>Fund type</dt><dd>${f.type}</dd></div>
            <div><dt>Risk level</dt><dd>${f.risk} of 7: ${config.riskWords[f.risk].toLowerCase()}</dd></div>
            <div><dt>Ongoing charge</dt><dd>${f.charge}% a year</dd></div>
          </dl>
        </oh-description-list>
        ${riskNote}
        <p class="small secondary">Fund details are mocked for this demo.</p>
      </oh-stack>
      <oh-cluster slot="footer" gap="sm">
        ${button(state.funds.includes(f.id) ? "Remove from my choices" : "Choose this fund", () => {
          toggleFund(f.id, !state.funds.includes(f.id));
          close();
        }, "secondary")}
      </oh-cluster>
    </oh-modal>
  `;
}

PAGES.funds = ({ changing }) => {
  const shown = visibleFunds();
  const submit = () => {
    if (!state.funds.length) return fail([{ field: "fund-list", message: "Choose at least one fund" }]);
    if (state.funds.length > limits.maxFunds) {
      return fail([{ field: "chosen", message: `You can choose up to ${limits.maxFunds} funds` }]);
    }
    continueFrom("funds", changing);
  };
  return {
    title: "Choose funds for this payment",
    body: html`
      <p>Choose up to ${limits.maxFunds} funds for your payment of ${formatPounds(net())}. You'll split
        the payment between them on the next page.</p>
      <oh-alert variant="neutral">
        <p><strong>We can't tell you which funds to choose.</strong> If you need help, speak to a
          financial adviser or get free guidance from
          <oh-link href=${config.links.moneyHelper} target="_blank">MoneyHelper</oh-link>.</p>
      </oh-alert>
      ${riskNote}

      <oh-stack gap="sm" id="chosen">
        <h2 id="chosen-heading" tabindex="-1">Your choices</h2>
        ${errorFor("chosen")
          ? html`<p class="field-error"><strong>Error:</strong> ${errorFor("chosen")}</p>`
          : nothing}
        <p aria-live="polite">${state.funds.length} of ${limits.maxFunds} funds chosen</p>
        ${state.funds.length
          ? html`<oh-cluster gap="xs">
              ${state.funds.map(
                (id) => html`<oh-tag removable value=${id} @oh-remove=${() => removeChosen(id)}>${fundById[id].name}</oh-tag>`
              )}
            </oh-cluster>`
          : nothing}
      </oh-stack>

      <oh-stack gap="md">
        <h2>Filter funds</h2>
        <fieldset class="filters">
          <legend>Risk level</legend>
          <oh-cluster gap="xs">
            ${RISK_BANDS.map(
              (b) => html`<oh-tag ?checked=${filters.risk.has(b.value)} @oh-change=${(e) => toggleFilter("risk", b.value, e.detail.checked)}>${b.label}</oh-tag>`
            )}
          </oh-cluster>
        </fieldset>
        <fieldset class="filters">
          <legend>Fund type</legend>
          <oh-cluster gap="xs">
            ${FUND_TYPES.map(
              (t) => html`<oh-tag ?checked=${filters.type.has(t)} @oh-change=${(e) => toggleFilter("type", t, e.detail.checked)}>${t}</oh-tag>`
            )}
          </oh-cluster>
        </fieldset>
      </oh-stack>

      <oh-stack gap="md">
        <h2 id="fund-list" tabindex="-1">Funds</h2>
        <p aria-live="polite">Showing ${shown.length} of ${config.funds.length} funds</p>
        ${errorFor("fund-list")
          ? html`<p class="field-error"><strong>Error:</strong> ${errorFor("fund-list")}</p>`
          : nothing}
        ${shown.length
          ? html`<ul class="fund-list">${shown.map(fundCard)}</ul>`
          : html`<p>No funds match these filters. Turn a filter off to see more.</p>`}
      </oh-stack>
      <div>${button("Continue", submit)}</div>
      ${fundDetailsModal()}
    `,
  };
};

/* Split: whole percentages that add up to 100 */

function splitPercents() {
  return state.funds.map((id) => parsePercent(state.split[id]).percent ?? 0);
}

function splitIsValid() {
  if (!state.funds.length) return false;
  if (state.funds.some((id) => parsePercent(state.split[id]).error)) return false;
  return splitPercents().reduce((a, b) => a + b, 0) === 100;
}

let splitAnnounceTimer;

PAGES.split = ({ changing }) => {
  if (state.funds.length === 1 && !state.split[state.funds[0]]) {
    set({ split: { [state.funds[0]]: "100" } });
  }
  const percents = splitPercents();
  const total = percents.reduce((a, b) => a + b, 0);
  const amounts = splitAmounts(net(), percents);
  const allocated = amounts.reduce((sum, a, i) => sum + (percents[i] ? a : 0), 0);

  const submit = () => {
    const list = [];
    for (const id of state.funds) {
      const result = parsePercent(state.split[id]);
      if (result.error) list.push({ field: `split-${id}`, message: `${fundById[id].name}: ${result.error}` });
    }
    if (!list.length && total !== 100) {
      list.push({ field: "split-total", message: `Your percentages add up to ${total}%. They must add up to 100%` });
    }
    if (!state.kidConfirmed) {
      list.push({ field: "kid", message: "Confirm you've read the key information for your chosen funds" });
    }
    if (list.length) return fail(list);
    continueFrom("split", changing);
  };

  const onPercent = (id) => (e) => {
    set({ split: { ...state.split, [id]: e.detail.value } });
    draw();
    clearTimeout(splitAnnounceTimer);
    splitAnnounceTimer = setTimeout(() => {
      const region = document.getElementById("split-announce");
      const sum = splitPercents().reduce((a, b) => a + b, 0);
      if (region) region.textContent = `Total ${sum}% of 100%`;
    }, 1000);
  };

  return {
    title: "Split your payment between funds",
    body: form(submit, html`
      <p>Enter a whole percentage for each fund. They must add up to 100%.</p>
      ${state.funds.map((id, i) => {
        const percentError = errors.find((e) => e.field === `split-${id}`);
        return html`
          <div class="split-row">
            <ohp-affix-input
              id="split-${id}"
              label=${fundById[id].name}
              affix-label="percent"
              suffix="%"
              inputmode="numeric"
              width="chars-5"
              .value=${state.split[id] ?? ""}
              error-text=${percentError ? parsePercent(state.split[id]).error : ""}
              @oh-input=${onPercent(id)}
            ></ohp-affix-input>
            <p class="secondary figure">${percents[i] ? formatPounds(amounts[i]) : "£0"} of your ${formatPounds(net())} payment</p>
          </div>
        `;
      })}

      <oh-card variant="subtle" id="split-total" tabindex="-1">
        <oh-stack gap="sm">
          <h2 class="h2">Total</h2>
          ${errorFor("split-total") && total !== 100
            ? html`<p class="field-error"><strong>Error:</strong> ${errorFor("split-total")}</p>`
            : nothing}
          <oh-progress label="Total of your percentages" .value=${Math.min(total, 100)} max="100" show-value></oh-progress>
          <p class="figure"><strong>${total}% of 100%</strong>${total > 100 ? html` (${total - 100}% too much)` : nothing}
            · ${formatPounds(allocated)} of ${formatPounds(net())}</p>
          <div aria-live="polite"><oh-visually-hidden id="split-announce"></oh-visually-hidden></div>
        </oh-stack>
      </oh-card>

      <oh-alert variant="neutral">
        <p>This split is for this payment, and the tax relief that follows it, only. Money already in
          your plan and any regular payments stay invested as they are now.</p>
      </oh-alert>

      <oh-stack gap="sm">
        <h2>Key information documents</h2>
        <ul>
          ${state.funds.map(
            (id) => html`<li><oh-link href="#/kid-placeholder" @click=${(e) => e.preventDefault()}>${fundById[id].name} key information document (placeholder)</oh-link></li>`
          )}
        </ul>
        <oh-checkbox
          id="kid"
          label="I've read the key information document for each fund I've chosen"
          ?checked=${state.kidConfirmed}
          error-text=${errorFor("kid")}
          @oh-change=${(e) => set({ kidConfirmed: e.detail.checked })}
        ></oh-checkbox>
      </oh-stack>
      ${riskNote}
      <div>${button("Continue", submit)}</div>
    `),
  };
};

/* ═══════════════════════════════════════════════════════════════
   5. Payment method
   ═══════════════════════════════════════════════════════════════ */

const METHODS = {
  card: { label: "Debit card", line: "Enter your card details on a secure payment page." },
  bank: { label: "Bank payment", line: "Approve the payment in your bank's app or website." },
};

PAGES.method = ({ changing }) => {
  const submit = () => {
    if (!state.method) return fail([{ field: "method", message: "Select how you want to pay" }]);
    continueFrom("method", changing);
  };
  return {
    title: "How do you want to pay?",
    body: form(submit, html`
      <oh-radio-group
        id="method"
        label="Choose a way to pay ${formatPounds(net())}"
        .options=${Object.entries(METHODS).map(([value, m]) => ({ value, label: `${m.label}: ${m.line}` }))}
        .value=${state.method}
        error-text=${errorFor("method")}
        @oh-change=${(e) => set({ method: e.detail.value })}
      ></oh-radio-group>
      <p class="secondary">We don't accept credit cards.</p>
      <div>${button("Continue", submit)}</div>
    `),
  };
};

/* ═══════════════════════════════════════════════════════════════
   6. Check and confirm
   ═══════════════════════════════════════════════════════════════ */

const ANSWER = {
  yes: "Yes", no: "No", "not-sure": "Not sure",
};

function changeLink(page, what) {
  return html`<dd data-actions><oh-link href="#/${page}?change">Change<oh-visually-hidden> ${what}</oh-visually-hidden></oh-link></dd>`;
}

function fundSplitRows(withChange) {
  if (state.invest !== "new") {
    return html`<div>
      <dt>Funds</dt>
      <dd>The same way as now: ${config.currentFunds.map((f) => `${fundById[f.id].name} ${f.percent}%`).join(", ")}</dd>
      ${withChange ? changeLink("investment", "how to invest") : nothing}
    </div>`;
  }
  const percents = splitPercents();
  const amounts = splitAmounts(net(), percents);
  return state.funds.map(
    (id, i) => html`<div>
      <dt>${fundById[id].name}</dt>
      <dd class="figure">${percents[i]}% (${formatPounds(amounts[i])})</dd>
      ${withChange ? changeLink("split", `the split for ${fundById[id].name}`) : nothing}
    </div>`
  );
}

PAGES.check = () => {
  const b = sums();
  const submit = () => {
    if (!state.declaration) return fail([{ field: "declaration", message: "Confirm the declaration to continue" }]);
    set({ outcome: "" });
    go("pay");
  };
  return {
    title: "Check your answers before you pay",
    body: html`
      <h2>Your payment</h2>
      <oh-description-list>
        <dl>
          <div><dt>You pay</dt><dd class="figure">${formatPounds(b.net)}</dd>${changeLink("amount", "the amount")}</div>
          <div><dt>Tax relief added later</dt><dd class="figure">${formatPounds(b.relief)}</dd></div>
          <div class="breakdown-total"><dt>Total going into your pension</dt><dd class="figure">${formatPounds(b.gross)}</dd></div>
          <div><dt>Tax year</dt><dd>${taxYear.label} (if it reaches us by ${longDate(taxYearEnd)})</dd></div>
          <div><dt>Payment method</dt><dd>${METHODS[state.method]?.label}</dd>${changeLink("method", "payment method")}</div>
        </dl>
      </oh-description-list>

      <h2>Tax relief</h2>
      <oh-description-list>
        <dl>
          <div><dt>UK resident for tax</dt><dd>${ANSWER[state.resident]}</dd>${changeLink("eligibility", "UK residence")}</div>
          <div><dt>Under 75</dt><dd>${ANSWER[state.under75]}</dd>${changeLink("eligibility", "age")}</div>
          <div><dt>Earn at least ${formatPounds(b.gross)} this tax year</dt>
            <dd>${ANSWER[state.earnings]}${state.earnings !== "yes"
              ? b.gross > limits.noEarningsGross
                ? html`<br /><span class="secondary">Tax relief may only apply to ${formatPounds(limits.noEarningsGross)} in total</span>`
                : html`<br /><span class="secondary">Within the ${formatPounds(limits.noEarningsGross)} limit for people without earnings</span>`
              : nothing}</dd>
            ${changeLink("earnings", "earnings")}</div>
          <div><dt>Taken money flexibly from a pension</dt>
            <dd>${ANSWER[state.flexible]}${state.flexible === "yes"
              ? html`<br /><span class="secondary">Your limit is ${formatPounds(limits.mpaaGross)} a year</span>`
              : nothing}</dd>
            ${changeLink("flexible", "whether you've taken money flexibly")}</div>
        </dl>
      </oh-description-list>

      <h2>How it's invested</h2>
      <oh-description-list>
        <dl>
          <div><dt>Investment</dt><dd>${state.invest === "new" ? "Different funds for this payment" : "The same way as now"}</dd>${changeLink("investment", "how to invest")}</div>
          ${fundSplitRows(true)}
        </dl>
      </oh-description-list>
      ${riskNote}

      <h2>Declaration</h2>
      <oh-alert variant="neutral">
        <p><strong>Placeholder: needs compliance review.</strong> I confirm that I'm a UK resident for tax
          purposes and under 75, that the information I've given is true and complete, and that I'll tell
          ${config.provider} if anything changes that affects my right to tax relief. I've read the
          <oh-link href=${config.links.terms}>terms and conditions (placeholder)</oh-link>.</p>
      </oh-alert>
      <oh-checkbox
        id="declaration"
        label="I confirm the declaration above is true"
        ?checked=${state.declaration}
        error-text=${errorFor("declaration")}
        @oh-change=${(e) => set({ declaration: e.detail.checked })}
      ></oh-checkbox>
      <div>${button(`Confirm and pay ${formatPounds(b.net)}`, submit)}</div>
    `,
  };
};

/* ═══════════════════════════════════════════════════════════════
   7. Pay: mocked provider screen, holding state, failure
   ═══════════════════════════════════════════════════════════════ */

PAGES.pay = () => {
  const card = state.method === "card";
  const answer = (outcome) => () => {
    set({ outcome });
    go("processing");
  };
  return {
    title: card ? "Mock card payment page" : "Mock banking app",
    journeyName: "Leaving Harbourline (mocked)",
    exit: false,
    back: null,
    body: html`
      <div class="mock-provider">
        <oh-stack gap="md">
          <p><strong>This screen stands in for ${card ? "a card payment provider" : "your bank"}.</strong>
            In the real service you'd ${card ? "enter your card details here" : "approve the payment in your banking app"}.
            Nothing is entered or taken in this demo.</p>
          <oh-description-list>
            <dl>
              <div><dt>Pay</dt><dd class="figure">${formatPounds(net())}</dd></div>
              <div><dt>To</dt><dd>${config.provider}</dd></div>
            </dl>
          </oh-description-list>
          <oh-cluster gap="sm">
            ${button(card ? "Pay (succeeds)" : "Approve (succeeds)", answer("success"))}
            ${card
              ? button("Decline the card (fails)", answer("declined"), "secondary")
              : button("Cancel in banking app", answer("cancelled"), "secondary")}
          </oh-cluster>
        </oh-stack>
      </div>
    `,
  };
};

let paymentTimer;

PAGES.processing = () => {
  clearTimeout(paymentTimer);
  paymentTimer = setTimeout(() => {
    if (currentRoute().page !== "processing") return;
    if (state.outcome === "success") {
      const b = sums();
      set({
        payment: {
          reference: `HL-${Math.floor(100000 + Math.random() * 900000)}`,
          date: today().toISOString(),
          ...b,
          invest: state.invest,
          funds: state.funds,
          percents: splitPercents(),
          method: state.method,
        },
      });
      go("confirmation");
    } else {
      go("failed");
    }
  }, config.paymentDelayMs);
  return {
    title: "Waiting for your payment",
    exit: false,
    back: null,
    body: html`
      <div aria-busy="true">
        <oh-stack gap="md">
          <oh-spinner size="lg" label="Checking your payment with ${state.method === "card" ? "the card provider" : "your bank"}"></oh-spinner>
          <p>This usually takes a few seconds. Please don't close this page or go back.</p>
        </oh-stack>
      </div>
      <div role="status"><oh-visually-hidden>Checking your payment. Please wait.</oh-visually-hidden></div>
    `,
  };
};

PAGES.failed = () => {
  const cancelled = state.outcome === "cancelled";
  return {
    title: cancelled ? "You cancelled the payment" : "Your payment didn't go through",
    back: { href: "#/check" },
    body: html`
      <oh-alert variant="error">
        <p>${cancelled
          ? "You cancelled the payment in your banking app. Nothing has been taken"
          : "Your payment didn't go through. You haven't been charged"}.</p>
      </oh-alert>
      <p>${cancelled
        ? "If you meant to cancel, you don't need to do anything. Your answers are saved until you close this tab."
        : "This can happen if there isn't enough money in the account, or your bank stopped the payment. Check with your bank, then try again."}</p>
      <oh-cluster gap="sm">
        ${button("Try again", () => go("pay"))}
        <oh-button variant="secondary" href="#/method?change">Choose a different way to pay</oh-button>
      </oh-cluster>
      <p>If it keeps happening, call us on ${config.contact.phone} (${config.contact.hours}).</p>
    `,
  };
};

/* ═══════════════════════════════════════════════════════════════
   8. Confirmation
   ═══════════════════════════════════════════════════════════════ */

PAGES.confirmation = () => {
  const p = state.payment;
  const amounts = p.invest === "new" ? splitAmounts(p.net, p.percents) : [];
  return {
    title: "Payment received",
    exit: "Back to your plan",
    back: null,
    body: html`
      <oh-card variant="featured">
        <oh-description-list>
          <dl>
            <div><dt>Reference</dt><dd class="figure"><strong>${p.reference}</strong></dd></div>
            <div><dt>Date</dt><dd>${longDate(new Date(p.date))}</dd></div>
            <div><dt>You paid</dt><dd class="figure">${formatPounds(p.net)}</dd></div>
            <div><dt>Tax relief to be added</dt><dd class="figure">${formatPounds(p.relief)}</dd></div>
            <div class="breakdown-total"><dt>Total going into your pension</dt><dd class="figure">${formatPounds(p.gross)}</dd></div>
            <div><dt>Paid by</dt><dd>${METHODS[p.method].label}</dd></div>
          </dl>
        </oh-description-list>
      </oh-card>

      <h2>How it's invested</h2>
      ${p.invest === "new"
        ? html`<oh-description-list>
            <dl>
              ${p.funds.map(
                (id, i) => html`<div><dt>${fundById[id].name}</dt><dd class="figure">${p.percents[i]}% (${formatPounds(amounts[i])})</dd></div>`
              )}
            </dl>
          </oh-description-list>
          <p>We'll buy units in these funds ${config.timings.unitsBought}. When tax relief arrives, it's
            invested the same way. Money already in your plan stays where it is.</p>`
        : html`<p>The same way as the rest of your plan:
            ${config.currentFunds.map((f) => `${fundById[f.id].name} ${f.percent}%`).join(", ")}. We'll buy
            units ${config.timings.unitsBought}.</p>`}

      <h2>What happens next</h2>
      <ol>
        <li>We'll email you a confirmation ${config.timings.email}.</li>
        <li>Your payment will show in your plan ${config.timings.paymentShows}.</li>
        <li>We'll claim ${formatPounds(p.relief)} tax relief from HMRC. It's usually added to your pension
          ${config.timings.reliefAdded}.</li>
        <li>If you pay tax at a higher rate, you can claim extra relief through Self Assessment.</li>
      </ol>
      ${riskNote}
      <oh-cluster gap="sm" class="no-print">
        ${button("Print or save as PDF", () => window.print(), "secondary")}
      </oh-cluster>
    `,
  };
};

/* ═══════════════════════════════════════════════════════════════
   Placeholders: exits are not built pages (brief FR-23)
   ═══════════════════════════════════════════════════════════════ */

PAGES.exit = () => ({
  title: state.payment ? "Back to your plan (placeholder)" : "You've left the payment (placeholder)",
  journeyName: config.provider,
  exit: false,
  back: null,
  body: html`
    <p>In the real service, this link would take you to your plan's home page, which this demo
      doesn't include.</p>
    ${state.payment
      ? nothing
      : html`<p>Nothing has been taken. Your answers are saved until you close this browser tab, so you
          can come back to them.</p>
        <div><oh-button href="#/${firstIncomplete()}">Return to your payment</oh-button></div>`}
  `,
});

PAGES["signed-out"] = () => ({
  title: "You've been signed out",
  journeyName: config.provider,
  exit: false,
  back: null,
  body: html`
    <p>We signed you out because you hadn't done anything for a while. This keeps your account safe.</p>
    <p>Nothing has been taken. Your answers are saved until you close this browser tab.</p>
    <div><oh-button href="#/start">Sign in again (placeholder)</oh-button></div>
  `,
});

PAGES["terms-placeholder"] = () => ({
  title: "Terms and conditions (placeholder)",
  journeyName: config.provider,
  back: { href: "#/check" },
  body: html`<p>Placeholder: the terms need writing and a compliance review.</p>`,
});

/* ═══════════════════════════════════════════════════════════════
   Session timeout: warn 2 minutes before, let them stay (WCAG 2.2.1)
   ═══════════════════════════════════════════════════════════════ */

const timeoutParam = new URLSearchParams(location.search).get("timeout") ??
  sessionStorage.getItem(`${STORE}-timeout`);
const timing = timeoutParam === "short" ? config.session.short : config.session;

const sessionTimer = {
  warning: false,
  warnAt: 0,
  endAt: 0,
  opener: null,
  activity() {
    if (this.warning) return;
    clearTimeout(this.warnAt);
    clearTimeout(this.endAt);
    const page = currentRoute().page;
    if (["signed-out", "exit", "confirmation"].includes(page)) return;
    this.warnAt = setTimeout(() => this.warn(), (timing.lengthSeconds - timing.warnBeforeSeconds) * 1000);
    this.endAt = setTimeout(() => this.expire(), timing.lengthSeconds * 1000);
  },
  warn() {
    this.opener = document.activeElement;
    this.warning = true;
    draw();
  },
  async stay() {
    this.warning = false;
    draw();
    this.activity();
    // The dialog has gone: put focus back where it was, or on the heading.
    await nextTick();
    const back = this.opener?.isConnected && this.opener !== document.body ? this.opener : null;
    if (back) back.focus();
    else focusHeading();
  },
  expire() {
    this.warning = false;
    go("signed-out");
  },
};

const minutes = Math.round(timing.warnBeforeSeconds / 60);

function timeoutModal() {
  if (!sessionTimer.warning) return nothing;
  return html`
    <oh-modal open heading="You'll be signed out soon" .dismissible=${false} size="sm">
      <oh-stack gap="sm">
        <p>For your security, we'll sign you out in ${minutes} ${minutes === 1 ? "minute" : "minutes"}
          if you don't do anything.</p>
        <p>Your answers are saved.</p>
      </oh-stack>
      <oh-cluster slot="footer" gap="sm">
        ${button("Stay signed in", () => sessionTimer.stay())}
        ${button("Sign out", () => sessionTimer.expire(), "secondary")}
      </oh-cluster>
    </oh-modal>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   Scenarios: ?scenario=s1 … s6 load answers and open the right page
   ═══════════════════════════════════════════════════════════════ */

const eligible = { resident: "yes", under75: "yes" };

const SCENARIO_SETUP = {
  // Pays £2,000 from a bonus by debit card
  s1: { state: { amount: "2000", ...eligible, earnings: "yes", flexible: "no", invest: "current", method: "card" }, page: "amount" },
  // Tops up in late March
  s2: { state: { amount: "1500", today: "2027-03-28" }, page: "amount" },
  // No earnings, pays £2,880
  s3: { state: { amount: "2880", ...eligible }, page: "earnings" },
  // Has taken money flexibly (assumed amount: £12,000, over the MPAA)
  s4: { state: { amount: "12000", ...eligible, earnings: "yes" }, page: "flexible" },
  // Anxious: part-way through, comes back later
  s5: { state: { amount: "1000", ...eligible, lastRoute: "earnings" }, page: "start" },
  // £5,000 split 60/40: new sustainable fund and a current fund
  s6: { state: { amount: "5000", ...eligible, earnings: "yes", flexible: "no", invest: "new", funds: ["sus-glb-eq", "glb-eq"] }, page: "funds" },
};

function loadScenario() {
  const params = new URLSearchParams(location.search);
  // ?timeout=short warns after 30 seconds, for testing; ?timeout=normal undoes it.
  if (params.has("timeout")) sessionStorage.setItem(`${STORE}-timeout`, params.get("timeout"));
  // ?theme=dark tries OHDS's opt-in dark theme; it lasts for the tab.
  if (params.has("theme")) sessionStorage.setItem(`${STORE}-theme`, params.get("theme"));
  if (sessionStorage.getItem(`${STORE}-theme`) === "dark") document.documentElement.dataset.theme = "dark";
  const today = params.get("today");
  const setup = SCENARIO_SETUP[params.get("scenario")?.toLowerCase()];
  if (setup) {
    state = { ...blank(), ...setup.state };
    filters = { risk: new Set(), type: new Set() };
    save();
  }
  if (today && /^\d{4}-\d{2}-\d{2}$/.test(today)) set({ today });
  if (setup || today || params.has("timeout") || params.has("theme")) {
    history.replaceState(null, "", `${location.pathname}#/${setup ? setup.page : currentRoute().page}`);
  }
}

loadScenario();
window.addEventListener("hashchange", route);
route();
