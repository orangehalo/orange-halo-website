/**
 * ohp-risk-scale — PROPOSED, not part of the released Orange Halo Design System.
 *
 * Shows where a fund sits on a numbered risk scale (1 to 7, as on a key
 * information document), as a row of steps with the fund's step filled,
 * plus the level in words and as a number. Built for the Single Pension
 * Contribution demo: OHDS has no meter, and oh-progress is for progress,
 * not a position on a scale.
 *
 * DESIGN DECISIONS
 * 1. Words and number, always. "Risk level 4 of 7: medium" is printed
 *    as text; the drawn steps repeat it for sighted readers. Colour is
 *    never the only cue: the filled step is solid, the others are outlines.
 * 2. One colour for every level. No traffic-light colours: the brief says
 *    funds are never ranked or highlighted, and red/green would read as
 *    "bad" and "good".
 * 3. Steps up to and including the level are filled, so the length of the
 *    filled run shows the level without counting.
 * 4. Not interactive: no focus stop, no hover, no states beyond the level.
 *    (The brief's state list - hover, focus, active, disabled, error,
 *    loading - doesn't apply to a read-only display.)
 *
 * ACCESSIBILITY
 * - role="img" on the drawn steps, named by the same sentence as the
 *   visible text, would repeat it; so the steps are aria-hidden and the
 *   text alone is read.
 * - Forced colours: steps use CanvasText borders and fill.
 *
 * TOKENS: color.data.categorical.1 (fill), color.border.emphasis (outline),
 * stroke.control, shape.compact, spacing.*, typography.body.sm.*.
 *
 * @element ohp-risk-scale
 * @attr level - The fund's level, 1 to max.
 * @attr max - How many levels the scale has (default 7).
 * @attr words - The level in words ("Medium").
 */

import { LitElement, html, css } from "https://cdn.jsdelivr.net/npm/lit@3.3.3/+esm";

export class OhpRiskScale extends LitElement {
  static properties = {
    level: { type: Number },
    max: { type: Number },
    words: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      box-sizing: border-box;
    }
    .scale {
      display: flex;
      flex-direction: column;
      gap: var(--oh-spacing-1);
    }
    .text {
      margin: 0;
      font-family: var(--oh-typography-body-font-family);
      font-size: var(--oh-typography-body-sm-font-size);
      line-height: var(--oh-typography-body-sm-line-height);
      letter-spacing: var(--oh-typography-body-sm-letter-spacing);
      color: var(--oh-color-text-primary);
    }
    .steps {
      display: flex;
      gap: var(--oh-spacing-0-5);
      max-inline-size: calc(var(--oh-spacing-20) * 2);
    }
    .step {
      flex: 1 1 0;
      block-size: var(--oh-spacing-2);
      border: var(--oh-stroke-control) solid var(--oh-color-border-emphasis);
      border-radius: var(--oh-shape-compact);
    }
    .step--on {
      background-color: var(--oh-color-data-categorical-1);
      border-color: var(--oh-color-data-categorical-1);
    }
    @media (forced-colors: active) {
      .step {
        border-color: CanvasText;
      }
      .step--on {
        background-color: CanvasText;
      }
    }
  `;

  constructor() {
    super();
    this.level = 1;
    this.max = 7;
    this.words = "";
  }

  render() {
    const level = Math.min(Math.max(this.level, 1), this.max);
    const steps = Array.from({ length: this.max }, (_, i) => i + 1);
    return html`
      <div class="scale" part="scale">
        <p class="text">
          Risk level ${level} of ${this.max}${this.words ? html`: ${this.words.toLowerCase()}` : ""}
        </p>
        <div class="steps" aria-hidden="true">
          ${steps.map((n) => html`<span class="step ${n <= level ? "step--on" : ""}"></span>`)}
        </div>
      </div>
    `;
  }
}

customElements.define("ohp-risk-scale", OhpRiskScale);
