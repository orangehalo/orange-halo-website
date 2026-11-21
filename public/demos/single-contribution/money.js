/**
 * Money: parsing, validation and the one tax relief calculation.
 * Everything is in pence (integers), so nothing is lost to rounding.
 */

import { config } from "./config.js";

/** Strip what people type around a number: "£", commas and spaces. */
export function cleanAmount(raw) {
  return String(raw ?? "").replace(/[£,\s]/g, "");
}

/**
 * Validate the amount field. Returns { pence } or { error }.
 * Order follows the brief: empty, not a number, decimals, minimum, maximum.
 */
export function parseAmount(raw) {
  const text = cleanAmount(raw);
  if (text === "") return { error: "Enter how much you want to pay in" };
  if (!/^\d+(\.\d+)?$/.test(text) && !/^\.\d+$/.test(text)) {
    return { error: "Amount must be a number, like 2000 or 2000.50" };
  }
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > 2) {
    return { error: "Amount must include no more than 2 decimal places" };
  }
  const pence = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
  if (pence < config.limits.minimumNet) {
    return { error: `Amount must be ${formatPounds(config.limits.minimumNet)} or more` };
  }
  if (pence > config.limits.maximumNet) {
    return {
      error: `Amount must be ${formatPounds(config.limits.maximumNet)} or less. Call us to pay in more`,
    };
  }
  return { pence };
}

/**
 * The breakdown: what you pay (net), the tax relief added and the total
 * (gross). Relief = net × rate ÷ (100 − rate), to the nearest penny
 * (halves round up). At 20%: £2,000 → £500 relief → £2,500.
 */
export function breakdown(netPence) {
  const rate = config.basicRatePercent;
  const relief = Math.round((netPence * rate) / (100 - rate));
  return { net: netPence, relief, gross: netPence + relief };
}

/** Net amount that grosses up to a gross limit (e.g. £3,600 → £2,880). */
export function netForGross(grossPence) {
  return Math.round((grossPence * (100 - config.basicRatePercent)) / 100);
}

const poundFormat = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

/** £2,000 for whole pounds, £2,000.50 otherwise. */
export function formatPounds(pence) {
  const text = poundFormat.format(pence / 100);
  return pence % 100 === 0 ? text.replace(/\.00$/, "") : text;
}

/** Split a payment by whole percentages. The last fund takes any odd penny. */
export function splitAmounts(totalPence, percents) {
  let given = 0;
  return percents.map((percent, index) => {
    if (index === percents.length - 1) return totalPence - given;
    const share = Math.round((totalPence * percent) / 100);
    given += share;
    return share;
  });
}

/** Validate one fund's percentage: a whole number from 1 to 100. */
export function parsePercent(raw) {
  const text = String(raw ?? "").replace(/[%\s]/g, "");
  if (!/^\d+$/.test(text) || Number(text) < 1 || Number(text) > 100) {
    return { error: "Enter a whole percentage from 1 to 100, like 25" };
  }
  return { percent: Number(text) };
}
