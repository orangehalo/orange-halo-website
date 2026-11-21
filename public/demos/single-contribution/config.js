/**
 * Journey config: every rule, limit and date the journey shows.
 *
 * Figures live here, never in the page copy, so they can change each tax
 * year. Money is in pence (integers); percentages are whole numbers.
 * The provider, funds and limits marked "assumed" come from the brief's
 * assumptions, not from any real provider.
 */

export const config = {
  provider: "Harbourline Pensions",
  journeyName: "Pay in a lump sum",
  totalSteps: 8,

  taxYear: {
    label: "2026/27",
    start: "2026-04-06",
    end: "2027-04-05",
  },

  /** Basic-rate tax relief, as a whole percentage of the gross payment. */
  basicRatePercent: 20,

  limits: {
    /** Assumed provider rule: block below this (net). */
    minimumNet: 10000,
    /** Assumed fraud limit: block above this (net). */
    maximumNet: 10000000,
    /** Tax relief limit with no relevant UK earnings (gross). */
    noEarningsGross: 360000,
    /** Annual allowance, across all pensions (gross). */
    annualAllowanceGross: 6000000,
    /** Money purchase annual allowance (gross). */
    mpaaGross: 1000000,
    /** Tax relief applies only to people under this age. */
    reliefAgeLimit: 75,
    /** Most funds a single payment can go into. */
    maxFunds: 5,
  },

  /** Session timing, in seconds. `?timeout=short` shortens it for testing. */
  session: {
    lengthSeconds: 15 * 60,
    warnBeforeSeconds: 2 * 60,
    short: { lengthSeconds: 150, warnBeforeSeconds: 120 },
  },

  /** How long the mocked payment provider takes to answer, in ms. */
  paymentDelayMs: 2500,

  timings: {
    /** Assumed: when the payment shows in the plan. */
    paymentShows: "within 2 working days",
    /** Assumed: when HMRC's tax relief reaches the pot. */
    reliefAdded: "within 11 weeks",
    /** Assumed: when units are bought. */
    unitsBought: "on the next working day after your payment reaches us",
    /** Assumed: when the confirmation email arrives. */
    email: "within 1 hour",
  },

  contact: {
    phone: "0800 000 0000",
    hours: "Monday to Friday, 8am to 6pm",
  },

  links: {
    moneyHelper: "https://www.moneyhelper.org.uk/en/pensions-and-retirement",
    pensionWise:
      "https://www.moneyhelper.org.uk/en/pensions-and-retirement/pension-wise",
    /** Placeholder exits: the brief says not to build these pages. */
    exit: "#/exit",
    signIn: "#/exit",
    terms: "#/terms-placeholder",
  },

  /** Plan's current investments (mocked). Percentages add up to 100. */
  currentFunds: [
    { id: "glb-eq", percent: 70 },
    { id: "mixed-60", percent: 30 },
  ],

  riskWords: {
    1: "Lowest",
    2: "Low",
    3: "Low to medium",
    4: "Medium",
    5: "Medium to high",
    6: "High",
    7: "Highest",
  },

  /** The mocked range of 12 funds. Charges are % a year. */
  funds: [
    {
      id: "cash",
      name: "Harbourline Cash Fund",
      type: "Cash",
      risk: 1,
      charge: "0.10",
      about:
        "Holds cash and short-term deposits. Aims to protect the value of your money, but may not keep up with inflation.",
    },
    {
      id: "gilts",
      name: "Harbourline UK Gilt Fund",
      type: "Bonds",
      risk: 2,
      charge: "0.15",
      about: "Lends to the UK government by holding gilts.",
    },
    {
      id: "corp-bond",
      name: "Harbourline Global Corporate Bond Fund",
      type: "Bonds",
      risk: 3,
      charge: "0.25",
      about: "Lends to companies around the world by holding their bonds.",
    },
    {
      id: "mixed-20",
      name: "Harbourline Cautious Mixed Fund",
      type: "Mixed assets",
      risk: 3,
      charge: "0.30",
      about: "Holds about 20% in shares and the rest in bonds and cash.",
    },
    {
      id: "mixed-60",
      name: "Harbourline Balanced Mixed Fund",
      type: "Mixed assets",
      risk: 4,
      charge: "0.30",
      about: "Holds about 60% in shares and the rest in bonds.",
    },
    {
      id: "sus-mixed",
      name: "Harbourline Sustainable Balanced Fund",
      type: "Sustainable",
      risk: 4,
      charge: "0.45",
      about:
        "Holds shares and bonds from companies and governments that meet the fund's environmental and social criteria.",
    },
    {
      id: "property",
      name: "Harbourline UK Property Fund",
      type: "Property",
      risk: 4,
      charge: "0.65",
      about:
        "Holds UK commercial property. It can take longer to sell than other funds.",
    },
    {
      id: "mixed-80",
      name: "Harbourline Adventurous Mixed Fund",
      type: "Mixed assets",
      risk: 5,
      charge: "0.30",
      about: "Holds about 80% in shares and the rest in bonds.",
    },
    {
      id: "uk-eq",
      name: "Harbourline UK Equity Index Fund",
      type: "UK shares",
      risk: 5,
      charge: "0.10",
      about: "Tracks the shares of the largest UK companies.",
    },
    {
      id: "glb-eq",
      name: "Harbourline Global Equity Index Fund",
      type: "Global shares",
      risk: 5,
      charge: "0.12",
      about: "Tracks the shares of large companies around the world.",
    },
    {
      id: "sus-glb-eq",
      name: "Harbourline Sustainable Global Equity Fund",
      type: "Sustainable",
      risk: 6,
      charge: "0.40",
      about:
        "Holds shares in companies around the world that meet the fund's environmental and social criteria.",
    },
    {
      id: "em-eq",
      name: "Harbourline Emerging Markets Equity Fund",
      type: "Global shares",
      risk: 7,
      charge: "0.35",
      about: "Holds shares in companies in developing economies.",
    },
  ],
};
