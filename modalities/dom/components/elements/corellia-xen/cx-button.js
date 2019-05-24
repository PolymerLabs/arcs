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
    display: inline-block;
  }
  ::slotted(*) {
    display: inline-block;
    box-sizing: border-box;
    border: 2px solid var(--cx-button-bg, #4285f4);
    margin: 0;
    padding: 8px 24px;
    background-color: var(--cx-button-bg, #4285f4);
    color: var(--cx-button-color, #fff);
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    text-decoration: none;
    text-transform: uppercase;
    border-radius: 4px;
    outline: none;
    -webkit-appearance: none;
    box-shadow: 0 2px 2px 0 rgba(0,0,0,0.14), 0 3px 1px -2px rgba(0,0,0,0.12), 0 1px 5px 0 rgba(0,0,0,0.2);
  }
  ::slotted(*:focus) {
    box-shadow: 0 6px 10px 0 rgba(0,0,0,0.14), 0 1px 18px 0 rgba(0,0,0,0.12), 0 3px 5px -1px rgba(0,0,0,0.2);
  }
  ::slotted(*:active) {
    background-color: var(--cx-active-bg, #454ac3);
    color: var(--cx-active-color, #fff);
  }
  ::slotted([disabled]) {
    border-color: silver;
    background-color: silver;
    color: whitesmoke;
    box-shadow: none;
  }
</style>

<slot id="button"></slot>

`;

class CorelliaXenButton extends Xen.Base {
  static get observedAttributes() {
    return [];
  }
  get template() {
    return template;
  }
  _render({}, state) {
  }
}
customElements.define('cx-button', CorelliaXenButton);
