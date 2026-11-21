/**
 * ohp-affix-input — PROPOSED, not part of the released Orange Halo Design System.
 *
 * A single-line field with a fixed prefix or suffix outside the text box:
 * "£" before an amount, "%" after a percentage. Built for the Single
 * Pension Contribution demo because oh-input has no prefix, suffix or
 * inputmode. Recommended for core as a variant of oh-input
 * (`prefix`, `suffix`, `inputmode`, `width`), not as a new element.
 *
 * DESIGN DECISIONS
 * 1. Same look, same API as oh-input. Field, label, helper, error, focus,
 *    hover, disabled and error states copy oh-input's tokens, so the two
 *    sit together without a seam. Attributes match oh-input's names.
 * 2. The affix is outside the input, in its own box joined to the field
 *    (color.surface.inset, color.border.emphasis), so it is never typed
 *    over or selected, and it doesn't shift the caret.
 * 3. The affix is read with the field: it is aria-hidden, and the input's
 *    name says the unit ("Amount you will pay, in pounds") through
 *    `affix-label`, so screen readers don't hear a bare "£".
 * 4. `inputmode` (decimal, numeric) brings up the right phone keyboard
 *    without type="number", which drops "£" and commas and misreads
 *    scroll-wheel input.
 * 5. Errors sit after the label and before the field, as oh-input's do,
 *    and are announced only when they appear after first render.
 * 6. `width` (chars-5, chars-10, full) fits the box to the expected
 *    answer, using spacing tokens, so the field's size hints at the
 *    answer's length.
 *
 * ACCESSIBILITY
 * - A real <input> carries the role, value and keyboard behaviour.
 * - Label, hint and error are linked with for/aria-describedby;
 *   aria-invalid is set in the error state. The error has an icon and
 *   text, so it doesn't rely on colour.
 * - delegatesFocus: focusing the host (from an error summary link)
 *   focuses the input.
 * - Focus is a solid inset ring in focus.ringColor, as oh-input's.
 * - The whole field is at least input.size.md.minHeight tall (over
 *   WCAG 2.5.8's 24 by 24 target).
 * - Transitions are cut under prefers-reduced-motion.
 *
 * STATES: rest, hover, focus, error, error + hover, error + focus,
 * disabled, required. (No loading state: a field doesn't load.)
 *
 * @element ohp-affix-input
 * @fires oh-input - As the text changes. detail: { value }
 * @fires oh-change - When the value is committed. detail: { value }
 */

import { LitElement, html, css, nothing } from "https://cdn.jsdelivr.net/npm/lit@3.3.3/+esm";

export class OhpAffixInput extends LitElement {
  static formAssociated = true;

  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static properties = {
    value: { type: String },
    label: { type: String },
    affixLabel: { type: String, attribute: "affix-label" },
    helperText: { type: String, attribute: "helper-text" },
    errorText: { type: String, attribute: "error-text" },
    name: { type: String, reflect: true },
    prefix: { type: String },
    suffix: { type: String },
    inputmode: { type: String },
    autocomplete: { type: String },
    width: { type: String, reflect: true },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    _announceError: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      box-sizing: border-box;
    }
    :host *,
    :host *::before,
    :host *::after {
      box-sizing: inherit;
    }

    .visually-hidden {
      position: absolute;
      clip-path: inset(50%);
      overflow: hidden;
      white-space: nowrap;
      inline-size: var(--oh-spacing-px);
      block-size: var(--oh-spacing-px);
    }

    .wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--oh-spacing-2);
    }

    .label {
      font-family: var(--oh-typography-control-font-family);
      font-size: var(--oh-typography-control-sm-font-size);
      font-weight: var(--oh-typography-control-font-weight);
      letter-spacing: var(--oh-typography-control-letter-spacing);
      color: var(--oh-color-text-primary);
    }
    .label--required::after {
      content: " *";
      color: var(--oh-color-feedback-error);
    }
    .label--disabled {
      color: var(--oh-color-text-disabled);
    }

    .helper {
      font-family: var(--oh-typography-body-font-family);
      font-size: var(--oh-typography-body-base-font-size);
      line-height: var(--oh-typography-body-base-line-height);
      letter-spacing: var(--oh-typography-control-letter-spacing);
      color: var(--oh-color-text-secondary);
    }
    .helper--error {
      display: flex;
      align-items: center;
      gap: var(--oh-spacing-2);
      color: var(--oh-color-feedback-error);
    }
    .error-icon {
      flex-shrink: 0;
      width: var(--oh-spacing-4);
      height: var(--oh-spacing-4);
    }

    /* The field: affix and input joined into one control. */
    .field {
      display: flex;
      align-items: stretch;
      max-width: 100%;
    }
    :host([width="chars-5"]) .field {
      width: calc(var(--oh-spacing-16) + var(--oh-spacing-10));
    }
    :host([width="chars-10"]) .field {
      width: calc(var(--oh-spacing-20) + var(--oh-spacing-20));
    }

    .affix {
      display: flex;
      align-items: center;
      padding: 0 var(--oh-spacing-3);
      font-family: var(--oh-typography-control-font-family);
      font-size: var(--oh-typography-control-md-font-size);
      font-weight: var(--oh-typography-control-font-weight);
      color: var(--oh-color-text-primary);
      background-color: var(--oh-color-surface-inset);
      border: var(--oh-input-base-border-width) solid var(--oh-color-border-emphasis);
    }
    .affix--prefix {
      border-inline-end: none;
      border-start-start-radius: var(--oh-shape-control);
      border-end-start-radius: var(--oh-shape-control);
    }
    .affix--suffix {
      border-inline-start: none;
      border-start-end-radius: var(--oh-shape-control);
      border-end-end-radius: var(--oh-shape-control);
    }

    .input {
      flex: 1 1 auto;
      min-width: 0;
      width: 100%;
      min-height: var(--oh-input-size-md-min-height);
      padding: var(--oh-spacing-3) var(--oh-spacing-4);
      font-family: var(--oh-typography-control-font-family);
      font-size: var(--oh-typography-control-md-font-size);
      font-variant-numeric: tabular-nums;
      color: var(--oh-color-text-primary);
      background-color: var(--oh-color-surface-field);
      border: var(--oh-input-base-border-width) solid var(--oh-color-border-emphasis);
      border-radius: var(--oh-shape-control);
      box-shadow: inset var(--oh-elevation-offset-md) var(--oh-elevation-offset-md) 0 0
        var(--oh-elevation-color-field);
      transition:
        border-color var(--oh-motion-snappy) ease,
        box-shadow var(--oh-motion-snappy) ease,
        background-color var(--oh-motion-quick) ease;
    }
    .field--prefix .input {
      border-start-start-radius: 0;
      border-end-start-radius: 0;
    }
    .field--suffix .input {
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }

    .input:hover:not(:focus):not(:disabled) {
      border-color: var(--oh-color-border-hover);
    }
    .input:focus {
      outline: none;
      background-color: var(--oh-color-surface-highlight);
      border-color: var(--oh-focus-ring-color);
      box-shadow: inset 0 0 0 var(--oh-focus-ring-width) var(--oh-focus-ring-color);
    }

    .input--error {
      border-color: var(--oh-color-feedback-error);
      background-color: var(--oh-color-feedback-error-subtle);
      box-shadow: inset var(--oh-elevation-offset-md) var(--oh-elevation-offset-md) 0 0
        var(--oh-elevation-color-error);
    }
    .input--error:hover:not(:focus):not(:disabled) {
      border-color: var(--oh-color-feedback-error-hover);
    }
    .input--error:focus {
      border-color: var(--oh-color-feedback-error);
      box-shadow: inset 0 0 0 var(--oh-focus-ring-width) var(--oh-color-feedback-error);
    }
    .field--error .affix {
      border-color: var(--oh-color-feedback-error);
    }

    .input:disabled {
      cursor: not-allowed;
      color: var(--oh-color-text-disabled);
      background-color: var(--oh-color-surface-disabled);
      border-color: var(--oh-color-border-disabled);
      box-shadow: none;
    }
    .field--disabled .affix {
      color: var(--oh-color-text-disabled);
      background-color: var(--oh-color-surface-disabled);
      border-color: var(--oh-color-border-disabled);
    }

    @media (prefers-reduced-motion: reduce) {
      .input {
        transition-duration: 0.01ms;
      }
    }

    @media (forced-colors: active) {
      .affix {
        border-color: CanvasText;
      }
    }
  `;

  constructor() {
    super();
    this.value = "";
    this.label = "";
    this.affixLabel = "";
    this.helperText = "";
    this.errorText = "";
    this.name = "";
    this.prefix = "";
    this.suffix = "";
    this.inputmode = "text";
    this.autocomplete = "off";
    this.width = "full";
    this.required = false;
    this.disabled = false;
    this._announceError = false;
    this._internals = this.attachInternals();
  }

  get form() {
    return this._internals.form;
  }

  focus(options) {
    this.renderRoot?.querySelector("input")?.focus(options);
  }

  willUpdate(changed) {
    if (this.hasUpdated && changed.has("errorText")) {
      this._announceError = !!this.errorText;
    }
  }

  updated(changed) {
    if (changed.has("value")) this._internals.setFormValue(this.value);
  }

  _onInput(event) {
    this.value = event.target.value;
    this.dispatchEvent(
      new CustomEvent("oh-input", { detail: { value: this.value }, bubbles: true, composed: true })
    );
  }

  _onChange() {
    this.dispatchEvent(
      new CustomEvent("oh-change", { detail: { value: this.value }, bubbles: true, composed: true })
    );
  }

  render() {
    const hasError = !!this.errorText;
    const describedBy = [hasError ? "error" : "", this.helperText ? "helper" : ""]
      .filter(Boolean)
      .join(" ");
    const fieldClass = [
      "field",
      this.prefix ? "field--prefix" : "",
      this.suffix ? "field--suffix" : "",
      hasError ? "field--error" : "",
      this.disabled ? "field--disabled" : "",
    ].join(" ");
    const labelClass = [
      "label",
      this.required ? "label--required" : "",
      this.disabled ? "label--disabled" : "",
    ].join(" ");

    return html`
      <div class="wrapper">
        <label class=${labelClass} for="input" part="label">
          ${this.label}${this.affixLabel
            ? html`<span class="visually-hidden"
                >, ${this.affixLabel}</span
              >`
            : nothing}
        </label>
        ${this.helperText
          ? html`<span id="helper" class="helper" part="helper">${this.helperText}</span>`
          : nothing}
        ${hasError
          ? html`<span
              id="error"
              class="helper helper--error"
              part="error"
              role=${this._announceError ? "alert" : nothing}
            >
              <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clip-rule="evenodd"
                />
              </svg>
              <span><span class="visually-hidden">Error: </span>${this.errorText}</span>
            </span>`
          : nothing}
        <div class=${fieldClass}>
          ${this.prefix
            ? html`<span class="affix affix--prefix" aria-hidden="true">${this.prefix}</span>`
            : nothing}
          <input
            id="input"
            part="input"
            class=${hasError ? "input input--error" : "input"}
            type="text"
            inputmode=${this.inputmode}
            autocomplete=${this.autocomplete}
            spellcheck="false"
            .value=${this.value}
            ?required=${this.required}
            ?disabled=${this.disabled}
            aria-invalid=${hasError ? "true" : nothing}
            aria-describedby=${describedBy || nothing}
            @input=${this._onInput}
            @change=${this._onChange}
          />
          ${this.suffix
            ? html`<span class="affix affix--suffix" aria-hidden="true">${this.suffix}</span>`
            : nothing}
        </div>
      </div>
    `;
  }
}

customElements.define("ohp-affix-input", OhpAffixInput);
