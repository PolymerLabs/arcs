/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../../xen/xen.js';

const html = Xen.Template.html;
const template = html`

<style>
  :host {
    display: inline-flex;
    flex-direction: column;
    margin: 20px 0;
  }
  /* NOTE: cannot style pseudo element via slotted */
  [name=input]::slotted(input::placeholder) {
    color: transparent;
  }
  [name=input]::slotted(input) {
    font-size: 1em;
    font-weight: 300;
    color: inherit;
    background-color: inherit;
    border: none;
    padding: 8px 0;
    width: 100%;
    outline: none;
  }
  [name=input]::slotted(input:invalid) {
    /* reset the default style in FF */
    box-shadow: none;
  }
  .decorator {
    display: block;
    height: 1px;
    width: 100%;
    margin: auto;
    border-top: 1px solid #ccc;
    position: relative;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
  }
  .underline {
    display: block;
    height: 2px;
    width: 100%;
    margin: auto;
    background-color: var(--app-accent-color, navy);
    position: absolute;
    top: -1px;
    left: 0;
    -webkit-transform: scale3d(0, 1, 1);
    transform: scale3d(0, 1, 1);
    transition: -webkit-transform 0.2s ease-in;
    transition: transform 0.2s ease-in;
  }
  /* input label */
  [name=label]::slotted(label) {
    display: block;
    pointer-events: none;
    opacity: 0.5;
    white-space: nowrap;
    text-align: left;
    text-overflow: ellipsis;
    overflow: hidden;
    transform-origin: 0 0;
    transform: translate3d(0px, -1.9em, 0px);
    will-change: transform;
    transition-property: opacity, -webkit-transform;
    transition-property: opacity, transform;
    transition-duration: 0.15s;
    transition-timing-function: ease-out;
  }
  /* Error message */
  .decorator::after {
    position: absolute;
    top: 8px;
    left: 0;
    right: 0;
    font-size: 0.65em;
    color: #dd2c00;
    content: attr(error-message);
    display: none;
    white-space: nowrap;
  }
  .underline-focus {
    -webkit-transform: scale3d(1, 1, 1);
    transform: scale3d(1, 1, 1);
    transition: -webkit-transform 0.2s ease-out;
    transition: transform 0.2s ease-out;
  }
  /* Label: valid state */
  .label-shift[name=label]::slotted(label) {
    -webkit-transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    opacity: 1;
  }
  /* Error message */
  .invalid.decorator::after {
    display: block;
  }
  /* Error label */
  .invalid[name=label]::slotted(label) {
    -webkit-transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    opacity: 1;
    color: #dd2c00;
  }
  /* Valid label */
  input:not(:focus):required:valid + .decorator > label {
    -webkit-transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    transform: translate3d(0px, -3.4em, 0px) scale(0.8, 0.8);
    opacity: 1;
  }
</style>
<slot name="input"></slot>
<div id="decorator" class="{{decoratorClass}}" error-message$="{{error}}" aria-hidden="true">
  <slot name="label" class="{{labelClass}}"></slot>
  <div class$="{{underlineClass}}" class="underline"></div>
</div>

`;

// TODO(sorvell): clicking on label should focus input.
class CorelliaXenInput extends Xen.Base {
  static get observedAttributes() {
    return ['error', 'value'];
  }
  get template() {
    return template;
  }
  _render({error, value}, state) {
    const input = this.querySelector('input');
    if (state.input !== input) {
      state.input = input;
      input.onblur = () => {
        state.wasBlurred = true;
        this._invalidate();
      };
      input.onfocus = input.oninput = () => this._invalidate();
      if (!input.placeholder) {
        input.placeholder = ' ';
      }
    }
    if (value && value !== input.value) {
      input.value = value;
    }
    let focused;
    let invalid;
    let placeholderShown;

    if (input) {
      focused = input.matches(':focus');
      invalid = input.matches(':invalid');
      placeholderShown = input.matches(':placeholder-shown');
    }
    const invalidClass = (state.wasBlurred || !focused && !placeholderShown) && invalid ? 'invalid' : '';
    return {
      error,
      underlineClass: focused ? 'underline underline-focus' : 'underline',
      decoratorClass: `decorator ${invalidClass}`,
      labelClass: [
        focused || !placeholderShown ? 'label-shift ' : '',
        invalidClass
      ].join(' ')
    };
  }
}
customElements.define('cx-input', CorelliaXenInput);
