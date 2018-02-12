/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../xen/xen.js';

const template = Xen.Template.createTemplate(
  `<style>
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
      color: var(--app-primary-color, black);
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
      top: 0;
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
  <div id="decorator" class$="{{decoratorClass}}" class="decorator" aria-hidden="true" error-messsage="{{error}}">
    <slot name="label" class="{{labelClass}}"></slot>
    <div class$="{{underlineClass}}" class="underline"></div>
  </div>`
);

// TODO(sorvell): clicking on label should focus input.
class CorelliaXenInput extends Xen.Base {
  static get observedAttributes() {
    return ['error'];
  }
  get template() { return template; }
  _render(props, state) {
    let input = this.querySelector('input');
    if (state.input !== input) {
      state.input = input;
      input.onblur = input.onfocus = () => this._invalidate();
      if (!input.placeholder) {
        input.placeholder = ' ';
      }
    }
    let focused, invalid, placeholderShown;
    if (state.input) {
      focused = input.matches(':focus');
      invalid = input.matches(':invalid');
      placeholderShown = input.matches(':placeholder-shown');
    }
    let invalidClass = !focused && !placeholderShown && invalid ? 'invalid' : '';
    return {
      error: props.error,
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
